import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify the caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callerUser) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Must be admin
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const PROTECTED_EMAILS = [
      "mjscoots9@gmail.com",
      "william.gardner127@gmail.com",
      "j.alvarez7925@gmail.com",
    ];

    // Confirm caller is the protected admin
    if (callerUser.email !== PROTECTED_EMAILS[0]) {
      return new Response(JSON.stringify({ error: "Only the primary admin can execute this purge" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all users
    let allUsers: any[] = [];
    let page = 1;
    const perPage = 1000;
    
    while (true) {
      const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (listError) throw new Error(`Failed to list users: ${listError.message}`);
      if (!listData?.users || listData.users.length === 0) break;
      allUsers = allUsers.concat(listData.users);
      if (listData.users.length < perPage) break;
      page++;
    }

    const protectedSet = new Set(PROTECTED_EMAILS.map(e => e.toLowerCase()));
    const usersToDelete = allUsers.filter(u => !protectedSet.has(u.email?.toLowerCase()));
    const userIdsToDelete = usersToDelete.map(u => u.id);

    console.log(`Purging ${userIdsToDelete.length} users, keeping ${PROTECTED_EMAILS.join(', ')}`);

    // Delete from dependent tables first (using service role bypasses RLS)
    if (userIdsToDelete.length > 0) {
      // Delete in batches of 100
      for (let i = 0; i < userIdsToDelete.length; i += 100) {
        const batch = userIdsToDelete.slice(i, i + 100);
        
        await supabaseAdmin.from("bootcamp_progress").delete().in("user_id", batch);
        await supabaseAdmin.from("lesson_progress").delete().in("user_id", batch);
        await supabaseAdmin.from("video_progress").delete().in("user_id", batch);
        await supabaseAdmin.from("leaderboard_points").delete().in("user_id", batch);
        await supabaseAdmin.from("user_training_achievements").delete().in("user_id", batch);
        await supabaseAdmin.from("user_notifications").delete().in("user_id", batch);
        await supabaseAdmin.from("user_priority_tasks").delete().in("user_id", batch);
        await supabaseAdmin.from("calendar_attendance").delete().in("user_id", batch);
        await supabaseAdmin.from("calendar_event_assignees").delete().in("user_id", batch);
        await supabaseAdmin.from("event_notifications").delete().in("user_id", batch);
        await supabaseAdmin.from("streak_breaks").delete().in("user_id", batch);
        await supabaseAdmin.from("user_roles").delete().in("user_id", batch);
        await supabaseAdmin.from("profiles").delete().in("user_id", batch);
      }

      // Delete auth users one by one
      let deleted = 0;
      let errors = 0;
      for (const userId of userIdsToDelete) {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (error) {
          console.error(`Failed to delete auth user ${userId}:`, error.message);
          errors++;
        } else {
          deleted++;
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Purged ${deleted} users. ${errors} errors. Kept ${PROTECTED_EMAILS.join(', ')}.`,
        deleted,
        errors,
        kept: PROTECTED_EMAILS,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "No users to purge.",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
