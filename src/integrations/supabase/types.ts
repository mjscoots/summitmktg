export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_codes: {
        Row: {
          code_hash: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          code_hash: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          code_hash?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      access_reset_2027: {
        Row: {
          approved: boolean | null
          direct_manager: string | null
          email: string | null
          full_name: string | null
          id: string
          profile_id: string
          rank_id: string | null
          reason: string
          region_id: string | null
          reset_at: string
          restored_at: string | null
          restored_by: string | null
          roles: string[]
          runs_vertical: boolean | null
          status: string | null
          team_id: string | null
          user_id: string | null
          vertical: string | null
          was_archived: boolean | null
        }
        Insert: {
          approved?: boolean | null
          direct_manager?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          profile_id: string
          rank_id?: string | null
          reason: string
          region_id?: string | null
          reset_at?: string
          restored_at?: string | null
          restored_by?: string | null
          roles?: string[]
          runs_vertical?: boolean | null
          status?: string | null
          team_id?: string | null
          user_id?: string | null
          vertical?: string | null
          was_archived?: boolean | null
        }
        Update: {
          approved?: boolean | null
          direct_manager?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          profile_id?: string
          rank_id?: string | null
          reason?: string
          region_id?: string | null
          reset_at?: string
          restored_at?: string | null
          restored_by?: string | null
          roles?: string[]
          runs_vertical?: boolean | null
          status?: string | null
          team_id?: string | null
          user_id?: string | null
          vertical?: string | null
          was_archived?: boolean | null
        }
        Relationships: []
      }
      action_items: {
        Row: {
          assigned_to: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          notified_at: string | null
          source: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          notified_at?: string | null
          source?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          notified_at?: string | null
          source?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_days: {
        Row: {
          created_at: string
          day: string
          id: string
          minutes: number
          screens: Json
          sessions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          id?: string
          minutes?: number
          screens?: Json
          sessions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          minutes?: number
          screens?: Json
          sessions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_queue_dismissals: {
        Row: {
          created_at: string
          dismissed_at: string
          dismissed_by: string | null
          id: string
          item_key: string
          item_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dismissed_at?: string
          dismissed_by?: string | null
          id?: string
          item_key: string
          item_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dismissed_at?: string
          dismissed_by?: string | null
          id?: string
          item_key?: string
          item_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_coach_conversations: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      announcement_acks: {
        Row: {
          acked_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          acked_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          acked_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_acks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "announcement_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_posts: {
        Row: {
          audience: string
          audience_team_id: string | null
          body: string
          category: string
          created_at: string
          created_by: string | null
          cta_label: string | null
          cta_target: string | null
          expires_at: string | null
          id: string
          is_auto_generated: boolean
          is_important: boolean
          is_pinned: boolean
          published_at: string | null
          source_id: string | null
          source_type: string | null
          status: string
          title: string
          updated_at: string
          vertical: string | null
        }
        Insert: {
          audience?: string
          audience_team_id?: string | null
          body?: string
          category?: string
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_target?: string | null
          expires_at?: string | null
          id?: string
          is_auto_generated?: boolean
          is_important?: boolean
          is_pinned?: boolean
          published_at?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          title: string
          updated_at?: string
          vertical?: string | null
        }
        Update: {
          audience?: string
          audience_team_id?: string | null
          body?: string
          category?: string
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_target?: string | null
          expires_at?: string | null
          id?: string
          is_auto_generated?: boolean
          is_important?: boolean
          is_pinned?: boolean
          published_at?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: string
          title?: string
          updated_at?: string
          vertical?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcement_posts_audience_team_id_fkey"
            columns: ["audience_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_views: {
        Row: {
          announcement_id: string
          id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          announcement_id: string
          id?: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          announcement_id?: string
          id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_views_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcement_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          id: string
          is_pinned: boolean | null
          target_role: Database["public"]["Enums"]["app_role"] | null
          team_ids: string[] | null
          title: string
          updated_at: string | null
          vertical: string | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          target_role?: Database["public"]["Enums"]["app_role"] | null
          team_ids?: string[] | null
          title: string
          updated_at?: string | null
          vertical?: string | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          target_role?: Database["public"]["Enums"]["app_role"] | null
          team_ids?: string[] | null
          title?: string
          updated_at?: string | null
          vertical?: string | null
        }
        Relationships: []
      }
      app_feedback: {
        Row: {
          admin_notes: string | null
          created_at: string
          feedback_type: string
          id: string
          message: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          feedback_type?: string
          id?: string
          message: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          feedback_type?: string
          id?: string
          message?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      applications: {
        Row: {
          application_type: string
          city_state: string
          created_at: string | null
          email: string
          first_touch_at: string | null
          full_name: string
          id: string
          notes: string | null
          partner_id: string | null
          phone: string
          previous_company: string | null
          referral_source: string
          referrer_user_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_code: string | null
          source_type: string
          status: string
          vertical: string | null
          years_experience: number | null
        }
        Insert: {
          application_type: string
          city_state: string
          created_at?: string | null
          email: string
          first_touch_at?: string | null
          full_name: string
          id?: string
          notes?: string | null
          partner_id?: string | null
          phone: string
          previous_company?: string | null
          referral_source: string
          referrer_user_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_code?: string | null
          source_type?: string
          status?: string
          vertical?: string | null
          years_experience?: number | null
        }
        Update: {
          application_type?: string
          city_state?: string
          created_at?: string | null
          email?: string
          first_touch_at?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          partner_id?: string | null
          phone?: string
          previous_company?: string | null
          referral_source?: string
          referrer_user_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_code?: string | null
          source_type?: string
          status?: string
          vertical?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_conflicts: {
        Row: {
          conflict_type: string
          created_at: string
          id: string
          new_manager_id: string | null
          new_team_id: string | null
          notes: string | null
          old_manager_id: string | null
          old_team_id: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          user_id: string
        }
        Insert: {
          conflict_type: string
          created_at?: string
          id?: string
          new_manager_id?: string | null
          new_team_id?: string | null
          notes?: string | null
          old_manager_id?: string | null
          old_team_id?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          user_id: string
        }
        Update: {
          conflict_type?: string
          created_at?: string
          id?: string
          new_manager_id?: string | null
          new_team_id?: string | null
          notes?: string | null
          old_manager_id?: string | null
          old_team_id?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      assistant_faq: {
        Row: {
          answer: string
          category: string | null
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          published: boolean
          question: string
          updated_at: string
          vertical: string | null
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          published?: boolean
          question: string
          updated_at?: string
          vertical?: string | null
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          published?: boolean
          question?: string
          updated_at?: string
          vertical?: string | null
        }
        Relationships: []
      }
      assistant_logs: {
        Row: {
          answer: string | null
          created_at: string
          id: string
          question: string
          role_at_ask: string | null
          user_id: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          id?: string
          question: string
          role_at_ask?: string | null
          user_id: string
        }
        Update: {
          answer?: string | null
          created_at?: string
          id?: string
          question?: string
          role_at_ask?: string | null
          user_id?: string
        }
        Relationships: []
      }
      assistant_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          thread_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "assistant_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_threads: {
        Row: {
          created_at: string
          id: string
          last_at: string
          mode: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_at?: string
          mode?: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_at?: string
          mode?: string
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          after_value: string | null
          before_value: string | null
          created_at: string
          entity_id: string | null
          entity_label: string | null
          entity_type: string
          field: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          after_value?: string | null
          before_value?: string | null
          created_at?: string
          entity_id?: string | null
          entity_label?: string | null
          entity_type: string
          field?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          after_value?: string | null
          before_value?: string | null
          created_at?: string
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string
          field?: string | null
          id?: string
        }
        Relationships: []
      }
      backup_job_tokens: {
        Row: {
          created_at: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          token?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      backup_snapshots: {
        Row: {
          created_at: string
          file_bytes: number
          id: string
          row_count: number
          storage_path: string
          table_count: number
          trigger_source: string
        }
        Insert: {
          created_at?: string
          file_bytes?: number
          id?: string
          row_count?: number
          storage_path: string
          table_count?: number
          trigger_source?: string
        }
        Update: {
          created_at?: string
          file_bytes?: number
          id?: string
          row_count?: number
          storage_path?: string
          table_count?: number
          trigger_source?: string
        }
        Relationships: []
      }
      badge_definitions: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          icon: string
          key: string
          kind: string
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          icon?: string
          key: string
          kind?: string
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          icon?: string
          key?: string
          kind?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      blitz_markets: {
        Row: {
          created_at: string
          id: string
          market: string
          official_event_id: string | null
          state: string
          status: string
          wave: number
          window_end: string
          window_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          market: string
          official_event_id?: string | null
          state: string
          status?: string
          wave: number
          window_end: string
          window_start: string
        }
        Update: {
          created_at?: string
          id?: string
          market?: string
          official_event_id?: string | null
          state?: string
          status?: string
          wave?: number
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "blitz_markets_official_event_id_fkey"
            columns: ["official_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      blitz_optins: {
        Row: {
          blitz_key: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          blitz_key: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          blitz_key?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      bootcamp_progress: {
        Row: {
          agreement_end_date: string | null
          agreement_start_date: string | null
          bootcamp_completed: boolean
          bootcamp_completed_at: string | null
          bootcamp_exempt: boolean
          commitment_end_date: string | null
          commitment_start_date: string | null
          created_at: string
          final_commitment_video_url: string | null
          id: string
          last_manager_reminder_at: string | null
          last_rep_reminder_at: string | null
          manager_notified_at: string | null
          motivation_video_url: string | null
          phase_1_complete: boolean
          phase_2_complete: boolean
          phase_2_video_url: string | null
          phase_3_complete: boolean
          phase_3_video_url: string | null
          signature_data: string | null
          signature_name: string | null
          sunblock_video_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agreement_end_date?: string | null
          agreement_start_date?: string | null
          bootcamp_completed?: boolean
          bootcamp_completed_at?: string | null
          bootcamp_exempt?: boolean
          commitment_end_date?: string | null
          commitment_start_date?: string | null
          created_at?: string
          final_commitment_video_url?: string | null
          id?: string
          last_manager_reminder_at?: string | null
          last_rep_reminder_at?: string | null
          manager_notified_at?: string | null
          motivation_video_url?: string | null
          phase_1_complete?: boolean
          phase_2_complete?: boolean
          phase_2_video_url?: string | null
          phase_3_complete?: boolean
          phase_3_video_url?: string | null
          signature_data?: string | null
          signature_name?: string | null
          sunblock_video_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agreement_end_date?: string | null
          agreement_start_date?: string | null
          bootcamp_completed?: boolean
          bootcamp_completed_at?: string | null
          bootcamp_exempt?: boolean
          commitment_end_date?: string | null
          commitment_start_date?: string | null
          created_at?: string
          final_commitment_video_url?: string | null
          id?: string
          last_manager_reminder_at?: string | null
          last_rep_reminder_at?: string | null
          manager_notified_at?: string | null
          motivation_video_url?: string | null
          phase_1_complete?: boolean
          phase_2_complete?: boolean
          phase_2_video_url?: string | null
          phase_3_complete?: boolean
          phase_3_video_url?: string | null
          signature_data?: string | null
          signature_name?: string | null
          sunblock_video_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_attendance: {
        Row: {
          answers: Json | null
          created_at: string | null
          event_id: string
          id: string
          marked_at: string | null
          marked_by: string | null
          present: boolean | null
          responded_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          answers?: Json | null
          created_at?: string | null
          event_id: string
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          present?: boolean | null
          responded_at?: string | null
          status: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          answers?: Json | null
          created_at?: string | null
          event_id?: string
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          present?: boolean | null
          responded_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_event_assignees: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_assignees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          event_date: string
          event_kind: string
          event_type: string | null
          id: string
          is_cancelled: boolean
          is_team_wide: boolean | null
          location: string | null
          manager_id: string | null
          parent_event_id: string | null
          questions: Json | null
          recurrence_count: number | null
          recurrence_day_of_month: number | null
          recurrence_days_of_week: number[] | null
          recurrence_end_date: string | null
          recurrence_interval: number | null
          recurrence_type: string | null
          rsvp_deadline: string | null
          scope: string
          target_role: Database["public"]["Enums"]["app_role"] | null
          team_id: string | null
          timezone: string | null
          title: string
          updated_at: string | null
          vertical: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_date: string
          event_kind?: string
          event_type?: string | null
          id?: string
          is_cancelled?: boolean
          is_team_wide?: boolean | null
          location?: string | null
          manager_id?: string | null
          parent_event_id?: string | null
          questions?: Json | null
          recurrence_count?: number | null
          recurrence_day_of_month?: number | null
          recurrence_days_of_week?: number[] | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_type?: string | null
          rsvp_deadline?: string | null
          scope?: string
          target_role?: Database["public"]["Enums"]["app_role"] | null
          team_id?: string | null
          timezone?: string | null
          title: string
          updated_at?: string | null
          vertical?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_date?: string
          event_kind?: string
          event_type?: string | null
          id?: string
          is_cancelled?: boolean
          is_team_wide?: boolean | null
          location?: string | null
          manager_id?: string | null
          parent_event_id?: string | null
          questions?: Json | null
          recurrence_count?: number | null
          recurrence_day_of_month?: number | null
          recurrence_days_of_week?: number[] | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_type?: string | null
          rsvp_deadline?: string | null
          scope?: string
          target_role?: Database["public"]["Enums"]["app_role"] | null
          team_id?: string | null
          timezone?: string | null
          title?: string
          updated_at?: string | null
          vertical?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_parent_event_id_fkey"
            columns: ["parent_event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      car_group_members: {
        Row: {
          car_group_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          car_group_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          car_group_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "car_group_members_car_group_id_fkey"
            columns: ["car_group_id"]
            isOneToOne: false
            referencedRelation: "car_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      car_groups: {
        Row: {
          area: string | null
          car_name: string
          created_at: string
          created_by: string | null
          driver_name: string | null
          driver_user_id: string | null
          group_date: string
          id: string
          published: boolean
          updated_at: string
        }
        Insert: {
          area?: string | null
          car_name: string
          created_at?: string
          created_by?: string | null
          driver_name?: string | null
          driver_user_id?: string | null
          group_date: string
          id?: string
          published?: boolean
          updated_at?: string
        }
        Update: {
          area?: string | null
          car_name?: string
          created_at?: string
          created_by?: string | null
          driver_name?: string | null
          driver_user_id?: string | null
          group_date?: string
          id?: string
          published?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      carriers: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          public: boolean
          updated_at: string
          vertical: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          public?: boolean
          updated_at?: string
          vertical: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          public?: boolean
          updated_at?: string
          vertical?: string
        }
        Relationships: []
      }
      celebration_log: {
        Row: {
          celebration_type: string
          id: string
          posted_at: string
          user_id: string
        }
        Insert: {
          celebration_type: string
          id?: string
          posted_at?: string
          user_id: string
        }
        Update: {
          celebration_type?: string
          id?: string
          posted_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_channel_mutes: {
        Row: {
          channel: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_channels: {
        Row: {
          color: string
          cover_image_path: string | null
          created_at: string
          created_by: string | null
          display_order: number
          icon: string
          id: string
          is_active: boolean
          kind: string
          label: string
          member_ids: string[]
          slug: string
          vertical: string | null
        }
        Insert: {
          color?: string
          cover_image_path?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          kind?: string
          label: string
          member_ids?: string[]
          slug: string
          vertical?: string | null
        }
        Update: {
          color?: string
          cover_image_path?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          kind?: string
          label?: string
          member_ids?: string[]
          slug?: string
          vertical?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          channel: string
          content: string
          created_at: string
          edited_at: string | null
          id: string
          is_ai: boolean
          is_pinned: boolean
          kind: string
          meta: Json | null
          ref_id: string | null
          reply_to: string | null
          user_id: string
        }
        Insert: {
          channel?: string
          content: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_ai?: boolean
          is_pinned?: boolean
          kind?: string
          meta?: Json | null
          ref_id?: string | null
          reply_to?: string | null
          user_id: string
        }
        Update: {
          channel?: string
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_ai?: boolean
          is_pinned?: boolean
          kind?: string
          meta?: Json | null
          ref_id?: string | null
          reply_to?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_poll_votes: {
        Row: {
          created_at: string
          id: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_index?: number
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "chat_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_polls: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_closed: boolean
          message_id: string
          options: Json
          question: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_closed?: boolean
          message_id: string
          options?: Json
          question: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_closed?: boolean
          message_id?: string
          options?: Json
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_polls_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_read_receipts: {
        Row: {
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_read_receipts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_read_state: {
        Row: {
          channel: string
          created_at: string
          last_read_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          last_read_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          last_read_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      commitment_interviews: {
        Row: {
          better_next_year: string | null
          committed_last_day: string | null
          created_at: string
          id: string
          manager_id: string
          next_year_intent: string
          rep_id: string
          season: string
          terms_acknowledged: boolean
          terms_text: string | null
          updated_at: string
          why_here: string | null
        }
        Insert: {
          better_next_year?: string | null
          committed_last_day?: string | null
          created_at?: string
          id?: string
          manager_id: string
          next_year_intent?: string
          rep_id: string
          season?: string
          terms_acknowledged?: boolean
          terms_text?: string | null
          updated_at?: string
          why_here?: string | null
        }
        Update: {
          better_next_year?: string | null
          committed_last_day?: string | null
          created_at?: string
          id?: string
          manager_id?: string
          next_year_intent?: string
          rep_id?: string
          season?: string
          terms_acknowledged?: boolean
          terms_text?: string | null
          updated_at?: string
          why_here?: string | null
        }
        Relationships: []
      }
      daily_challenges: {
        Row: {
          bonus_awarded: boolean
          bonus_points: number
          challenge_date: string
          chat_messages_current: number
          chat_messages_target: number
          created_at: string
          id: string
          lessons_current: number
          lessons_target: number
          train_minutes_current: number
          train_minutes_target: number
          updated_at: string
          user_id: string
        }
        Insert: {
          bonus_awarded?: boolean
          bonus_points?: number
          challenge_date?: string
          chat_messages_current?: number
          chat_messages_target?: number
          created_at?: string
          id?: string
          lessons_current?: number
          lessons_target?: number
          train_minutes_current?: number
          train_minutes_target?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          bonus_awarded?: boolean
          bonus_points?: number
          challenge_date?: string
          chat_messages_current?: number
          chat_messages_target?: number
          created_at?: string
          id?: string
          lessons_current?: number
          lessons_target?: number
          train_minutes_current?: number
          train_minutes_target?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_login_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_login_date: string | null
          longest_streak: number
          previous_streak: number
          streak_points_awarded: number
          streak_restores_remaining: number
          total_days_active: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_login_date?: string | null
          longest_streak?: number
          previous_streak?: number
          streak_points_awarded?: number
          streak_restores_remaining?: number
          total_days_active?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_login_date?: string | null
          longest_streak?: number
          previous_streak?: number
          streak_points_awarded?: number
          streak_restores_remaining?: number
          total_days_active?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_point_caps: {
        Row: {
          chat_hour_window_start: string | null
          chat_messages_counted_this_hour: number | null
          chat_points: number | null
          created_at: string | null
          date: string
          hours_points: number | null
          id: string
          lesson_points: number | null
          lessons_completed_today: number | null
          manual_points: number | null
          reaction_given_points: number | null
          reaction_received_points: number | null
          user_id: string
          video_points: number | null
        }
        Insert: {
          chat_hour_window_start?: string | null
          chat_messages_counted_this_hour?: number | null
          chat_points?: number | null
          created_at?: string | null
          date: string
          hours_points?: number | null
          id?: string
          lesson_points?: number | null
          lessons_completed_today?: number | null
          manual_points?: number | null
          reaction_given_points?: number | null
          reaction_received_points?: number | null
          user_id: string
          video_points?: number | null
        }
        Update: {
          chat_hour_window_start?: string | null
          chat_messages_counted_this_hour?: number | null
          chat_points?: number | null
          created_at?: string | null
          date?: string
          hours_points?: number | null
          id?: string
          lesson_points?: number | null
          lessons_completed_today?: number | null
          manual_points?: number | null
          reaction_given_points?: number | null
          reaction_received_points?: number | null
          user_id?: string
          video_points?: number | null
        }
        Relationships: []
      }
      daily_training_time: {
        Row: {
          app_minutes: number
          created_at: string
          date: string
          id: string
          lesson_minutes: number
          total_minutes: number
          training_minutes: number
          updated_at: string
          user_id: string
          video_minutes: number
        }
        Insert: {
          app_minutes?: number
          created_at?: string
          date?: string
          id?: string
          lesson_minutes?: number
          total_minutes?: number
          training_minutes?: number
          updated_at?: string
          user_id: string
          video_minutes?: number
        }
        Update: {
          app_minutes?: number
          created_at?: string
          date?: string
          id?: string
          lesson_minutes?: number
          total_minutes?: number
          training_minutes?: number
          updated_at?: string
          user_id?: string
          video_minutes?: number
        }
        Relationships: []
      }
      downline_edges: {
        Row: {
          child_user_id: string
          created_at: string
          edge_type: string
          id: string
          parent_user_id: string
          updated_at: string
        }
        Insert: {
          child_user_id: string
          created_at?: string
          edge_type?: string
          id?: string
          parent_user_id: string
          updated_at?: string
        }
        Update: {
          child_user_id?: string
          created_at?: string
          edge_type?: string
          id?: string
          parent_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      drill_completions: {
        Row: {
          created_at: string
          drill_date: string
          drill_id: string
          id: string
          response: string
          user_id: string
        }
        Insert: {
          created_at?: string
          drill_date: string
          drill_id: string
          id?: string
          response?: string
          user_id: string
        }
        Update: {
          created_at?: string
          drill_date?: string
          drill_id?: string
          id?: string
          response?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drill_completions_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "training_drills"
            referencedColumns: ["id"]
          },
        ]
      }
      event_notifications: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_id: string
          id: string
          notification_type: string
          sent_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_id: string
          id?: string
          notification_type: string
          sent_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_id?: string
          id?: string
          notification_type?: string
          sent_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      fiber_day_numbers: {
        Row: {
          carrier_id: string | null
          created_at: string
          day: string
          entered_by: string | null
          id: string
          note: string | null
          sold: number
          updated_at: string
          user_id: string
        }
        Insert: {
          carrier_id?: string | null
          created_at?: string
          day?: string
          entered_by?: string | null
          id?: string
          note?: string | null
          sold?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          carrier_id?: string | null
          created_at?: string
          day?: string
          entered_by?: string | null
          id?: string
          note?: string | null
          sold?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiber_day_numbers_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
        ]
      }
      fiber_editors: {
        Row: {
          created_at: string
          granted_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fiber_installs: {
        Row: {
          batch_id: string | null
          cancels: number
          carrier_id: string
          created_at: string
          entered_by: string | null
          id: string
          installs: number
          notes: string | null
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          batch_id?: string | null
          cancels?: number
          carrier_id: string
          created_at?: string
          entered_by?: string | null
          id?: string
          installs?: number
          notes?: string | null
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          batch_id?: string | null
          cancels?: number
          carrier_id?: string
          created_at?: string
          entered_by?: string | null
          id?: string
          installs?: number
          notes?: string | null
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "fiber_installs_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
        ]
      }
      fiber_pay_weeks: {
        Row: {
          batch_id: string | null
          costs: number | null
          created_at: string
          entered_by: string | null
          gross: number | null
          id: string
          overrides: number | null
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          batch_id?: string | null
          costs?: number | null
          created_at?: string
          entered_by?: string | null
          gross?: number | null
          id?: string
          overrides?: number | null
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          batch_id?: string | null
          costs?: number | null
          created_at?: string
          entered_by?: string | null
          gross?: number | null
          id?: string
          overrides?: number | null
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      home_question_answers: {
        Row: {
          answer: string | null
          created_at: string
          id: string
          period: string
          question_id: string
          skipped: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          id?: string
          period?: string
          question_id: string
          skipped?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string | null
          created_at?: string
          id?: string
          period?: string
          question_id?: string
          skipped?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "home_question_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "home_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      home_questions: {
        Row: {
          active_from: string
          active_to: string | null
          answer_type: string
          audience_type: string
          audience_value: string | null
          cadence: string
          choices: Json
          created_at: string
          created_by: string | null
          display_order: number
          helper: string | null
          id: string
          is_active: boolean
          link_key: string | null
          question: string
          updated_at: string
        }
        Insert: {
          active_from?: string
          active_to?: string | null
          answer_type?: string
          audience_type?: string
          audience_value?: string | null
          cadence?: string
          choices?: Json
          created_at?: string
          created_by?: string | null
          display_order?: number
          helper?: string | null
          id?: string
          is_active?: boolean
          link_key?: string | null
          question: string
          updated_at?: string
        }
        Update: {
          active_from?: string
          active_to?: string | null
          answer_type?: string
          audience_type?: string
          audience_value?: string | null
          cadence?: string
          choices?: Json
          created_at?: string
          created_by?: string | null
          display_order?: number
          helper?: string | null
          id?: string
          is_active?: boolean
          link_key?: string | null
          question?: string
          updated_at?: string
        }
        Relationships: []
      }
      inactive_users_log: {
        Row: {
          created_at: string
          days_count: number
          email_day_3_sent: boolean
          email_day_4_sent: boolean
          id: string
          last_email_sent_at: string | null
          resolved_at: string | null
          started_inactive_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days_count?: number
          email_day_3_sent?: boolean
          email_day_4_sent?: boolean
          id?: string
          last_email_sent_at?: string | null
          resolved_at?: string | null
          started_inactive_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          days_count?: number
          email_day_3_sent?: boolean
          email_day_4_sent?: boolean
          id?: string
          last_email_sent_at?: string | null
          resolved_at?: string | null
          started_inactive_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inactivity_email_log: {
        Row: {
          clicked_at: string | null
          created_at: string
          days_inactive: number
          email_type: string
          id: string
          opened_at: string | null
          recipient_email: string
          returned_within_24h: boolean | null
          returned_within_48h: boolean | null
          returned_within_7d: boolean | null
          sent_at: string
          subject: string
          user_id: string
        }
        Insert: {
          clicked_at?: string | null
          created_at?: string
          days_inactive: number
          email_type: string
          id?: string
          opened_at?: string | null
          recipient_email: string
          returned_within_24h?: boolean | null
          returned_within_48h?: boolean | null
          returned_within_7d?: boolean | null
          sent_at?: string
          subject: string
          user_id: string
        }
        Update: {
          clicked_at?: string | null
          created_at?: string
          days_inactive?: number
          email_type?: string
          id?: string
          opened_at?: string | null
          recipient_email?: string
          returned_within_24h?: boolean | null
          returned_within_48h?: boolean | null
          returned_within_7d?: boolean | null
          sent_at?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      incentives: {
        Row: {
          created_at: string
          ends_on: string | null
          id: string
          is_active: boolean
          metric: string
          name: string
          prize_note: string | null
          target: number
        }
        Insert: {
          created_at?: string
          ends_on?: string | null
          id?: string
          is_active?: boolean
          metric: string
          name: string
          prize_note?: string | null
          target: number
        }
        Update: {
          created_at?: string
          ends_on?: string | null
          id?: string
          is_active?: boolean
          metric?: string
          name?: string
          prize_note?: string | null
          target?: number
        }
        Relationships: []
      }
      invites: {
        Row: {
          created_at: string
          created_by: string
          experience_level: Database["public"]["Enums"]["experience_level"]
          expires_at: string
          id: string
          manager_id: string | null
          note: string | null
          region: string | null
          revoked_at: string | null
          role: string
          team_id: string | null
          token: string
          used_at: string | null
          used_by: string | null
          vertical: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          experience_level?: Database["public"]["Enums"]["experience_level"]
          expires_at?: string
          id?: string
          manager_id?: string | null
          note?: string | null
          region?: string | null
          revoked_at?: string | null
          role?: string
          team_id?: string | null
          token: string
          used_at?: string | null
          used_by?: string | null
          vertical?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          experience_level?: Database["public"]["Enums"]["experience_level"]
          expires_at?: string
          id?: string
          manager_id?: string | null
          note?: string | null
          region?: string | null
          revoked_at?: string | null
          role?: string
          team_id?: string | null
          token?: string
          used_at?: string | null
          used_by?: string | null
          vertical?: string | null
        }
        Relationships: []
      }
      ladder_rungs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          rung: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          rung: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          rung?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_activities: {
        Row: {
          actor_id: string | null
          body: string | null
          created_at: string
          id: string
          kind: string
          lead_id: string
          next_call_at: string | null
          outcome: string | null
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          lead_id: string
          next_call_at?: string | null
          outcome?: string | null
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          lead_id?: string
          next_call_at?: string | null
          outcome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "people_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_call_cursors: {
        Row: {
          created_at: string
          lead_id: string | null
          scope: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          lead_id?: string | null
          scope?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          lead_id?: string | null
          scope?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_call_cursors_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "people_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_private_notes: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          kind: string
          lead_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          kind?: string
          lead_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          kind?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_private_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "people_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_route_blocked_managers: {
        Row: {
          created_at: string
          full_name: string
          id: string
          reason: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          reason?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          reason?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      lead_sheet_import: {
        Row: {
          days: number | null
          days_left: number | null
          first_name: string | null
          full_name: string | null
          id: number
          last_day: string | null
          last_name: string | null
          manager: string | null
          match_how: string | null
          matched_lead: string | null
          notes: string | null
          recruiter: string | null
          rev_day: number | null
          revenue: number | null
          role_title: string | null
          roster_status: string | null
          section: string | null
          signed: boolean | null
          start_date: string | null
          system: string | null
          team: string | null
          yr: string | null
        }
        Insert: {
          days?: number | null
          days_left?: number | null
          first_name?: string | null
          full_name?: string | null
          id?: number
          last_day?: string | null
          last_name?: string | null
          manager?: string | null
          match_how?: string | null
          matched_lead?: string | null
          notes?: string | null
          recruiter?: string | null
          rev_day?: number | null
          revenue?: number | null
          role_title?: string | null
          roster_status?: string | null
          section?: string | null
          signed?: boolean | null
          start_date?: string | null
          system?: string | null
          team?: string | null
          yr?: string | null
        }
        Update: {
          days?: number | null
          days_left?: number | null
          first_name?: string | null
          full_name?: string | null
          id?: number
          last_day?: string | null
          last_name?: string | null
          manager?: string | null
          match_how?: string | null
          matched_lead?: string | null
          notes?: string | null
          recruiter?: string | null
          rev_day?: number | null
          revenue?: number | null
          role_title?: string | null
          roster_status?: string | null
          section?: string | null
          signed?: boolean | null
          start_date?: string | null
          system?: string | null
          team?: string | null
          yr?: string | null
        }
        Relationships: []
      }
      leaderboard_points: {
        Row: {
          call_attendance_points: number | null
          id: string
          quiz_points: number | null
          roleplay_points: number | null
          total_points: number | null
          training_points: number | null
          updated_at: string | null
          user_id: string
          week_start: string
        }
        Insert: {
          call_attendance_points?: number | null
          id?: string
          quiz_points?: number | null
          roleplay_points?: number | null
          total_points?: number | null
          training_points?: number | null
          updated_at?: string | null
          user_id: string
          week_start: string
        }
        Update: {
          call_attendance_points?: number | null
          id?: string
          quiz_points?: number | null
          roleplay_points?: number | null
          total_points?: number | null
          training_points?: number | null
          updated_at?: string | null
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          last_attempt_at: string | null
          lesson_id: string
          quiz_attempts: number | null
          quiz_passed: boolean | null
          quiz_score: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_attempt_at?: string | null
          lesson_id: string
          quiz_attempts?: number | null
          quiz_passed?: boolean | null
          quiz_score?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_attempt_at?: string | null
          lesson_id?: string
          quiz_attempts?: number | null
          quiz_passed?: boolean | null
          quiz_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "training_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      life_pipeline: {
        Row: {
          contact_name: string
          created_at: string
          id: string
          next_at: string | null
          next_step: string | null
          notes: string | null
          phone: string | null
          stage: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_name: string
          created_at?: string
          id?: string
          next_at?: string | null
          next_step?: string | null
          notes?: string | null
          phone?: string | null
          stage?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_name?: string
          created_at?: string
          id?: string
          next_at?: string | null
          next_step?: string | null
          notes?: string | null
          phone?: string | null
          stage?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      managed_emails: {
        Row: {
          created_at: string | null
          created_by: string | null
          display_order: number | null
          email: string
          id: string
          is_active: boolean | null
          label: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          email: string
          id?: string
          is_active?: boolean | null
          label?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          email?: string
          id?: string
          is_active?: boolean | null
          label?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      managed_links: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          target_role: string
          title: string
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          target_role?: string
          title: string
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          target_role?: string
          title?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      manager_meeting_submissions: {
        Row: {
          created_at: string
          data: Json
          id: string
          updated_at: string
          user_id: string
          week_of: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          user_id?: string
          week_of: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          updated_at?: string
          user_id?: string
          week_of?: string
        }
        Relationships: []
      }
      manager_notifications: {
        Row: {
          created_at: string
          id: string
          manager_name: string
          message: string
          rep_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          manager_name: string
          message: string
          rep_name: string
        }
        Update: {
          created_at?: string
          id?: string
          manager_name?: string
          message?: string
          rep_name?: string
        }
        Relationships: []
      }
      manager_spreadsheets: {
        Row: {
          created_at: string
          created_by: string | null
          display_order: number
          embed_url: string
          id: string
          is_active: boolean
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          embed_url: string
          id?: string
          is_active?: boolean
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          embed_url?: string
          id?: string
          is_active?: boolean
          title?: string
        }
        Relationships: []
      }
      manual_chapter_progress: {
        Row: {
          chapter_id: string
          completed_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          chapter_id: string
          completed_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          chapter_id?: string
          completed_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      manual_read_completions: {
        Row: {
          completed_at: string
          completion_number: number
          course_slug: string
          id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          completion_number?: number
          course_slug?: string
          id?: string
          user_id: string
        }
        Update: {
          completed_at?: string
          completion_number?: number
          course_slug?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      mastery_checks: {
        Row: {
          completed_at: string
          created_at: string
          id: string
          marked_by: string | null
          module_id: string
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          id?: string
          marked_by?: string | null
          module_id: string
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          id?: string
          marked_by?: string | null
          module_id?: string
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mastery_checks_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          announcements: boolean
          bootcamp_reminders: boolean
          calendar_events: boolean
          chat_mentions: boolean
          created_at: string
          id: string
          lead_expiry: boolean
          leaderboard: boolean
          new_leads: boolean
          streak_milestones: boolean
          training_quiz: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          announcements?: boolean
          bootcamp_reminders?: boolean
          calendar_events?: boolean
          chat_mentions?: boolean
          created_at?: string
          id?: string
          lead_expiry?: boolean
          leaderboard?: boolean
          new_leads?: boolean
          streak_milestones?: boolean
          training_quiz?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          announcements?: boolean
          bootcamp_reminders?: boolean
          calendar_events?: boolean
          chat_mentions?: boolean
          created_at?: string
          id?: string
          lead_expiry?: boolean
          leaderboard?: boolean
          new_leads?: boolean
          streak_milestones?: boolean
          training_quiz?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      offices: {
        Row: {
          created_at: string
          housing_address: string | null
          id: string
          meeting_space_note: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          housing_address?: string | null
          id?: string
          meeting_space_note?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          housing_address?: string | null
          id?: string
          meeting_space_note?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      onboarding_days: {
        Row: {
          created_at: string
          day: number
          id: string
          items: Json
          published: boolean
          title: string
          updated_at: string
          updated_by: string | null
          vertical: string
        }
        Insert: {
          created_at?: string
          day: number
          id?: string
          items?: Json
          published?: boolean
          title: string
          updated_at?: string
          updated_by?: string | null
          vertical: string
        }
        Update: {
          created_at?: string
          day?: number
          id?: string
          items?: Json
          published?: boolean
          title?: string
          updated_at?: string
          updated_by?: string | null
          vertical?: string
        }
        Relationships: []
      }
      onboarding_marks: {
        Row: {
          day: number
          id: string
          item_key: string
          marked_at: string
          marked_by: string | null
          user_id: string
        }
        Insert: {
          day: number
          id?: string
          item_key: string
          marked_at?: string
          marked_by?: string | null
          user_id: string
        }
        Update: {
          day?: number
          id?: string
          item_key?: string
          marked_at?: string
          marked_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      one_on_one_rep_order: {
        Row: {
          display_order: number
          id: string
          manager_id: string
          rep_user_id: string
          updated_at: string
        }
        Insert: {
          display_order?: number
          id?: string
          manager_id: string
          rep_user_id: string
          updated_at?: string
        }
        Update: {
          display_order?: number
          id?: string
          manager_id?: string
          rep_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      pairing_requests: {
        Row: {
          created_at: string
          decline_reason: string | null
          id: string
          manager_id: string
          rep_id: string
          responded_at: string | null
          status: string
          updated_at: string
          vertical: string
        }
        Insert: {
          created_at?: string
          decline_reason?: string | null
          id?: string
          manager_id: string
          rep_id: string
          responded_at?: string | null
          status?: string
          updated_at?: string
          vertical: string
        }
        Update: {
          created_at?: string
          decline_reason?: string | null
          id?: string
          manager_id?: string
          rep_id?: string
          responded_at?: string | null
          status?: string
          updated_at?: string
          vertical?: string
        }
        Relationships: []
      }
      partners: {
        Row: {
          active: boolean
          code: string
          contact: string | null
          created_at: string
          id: string
          name: string
          terms_note: string | null
          updated_at: string
          verticals: string[]
        }
        Insert: {
          active?: boolean
          code: string
          contact?: string | null
          created_at?: string
          id?: string
          name: string
          terms_note?: string | null
          updated_at?: string
          verticals?: string[]
        }
        Update: {
          active?: boolean
          code?: string
          contact?: string | null
          created_at?: string
          id?: string
          name?: string
          terms_note?: string | null
          updated_at?: string
          verticals?: string[]
        }
        Relationships: []
      }
      people_leads: {
        Row: {
          ai_summary: string | null
          bucket: string
          call_count: number
          claimed_at: string | null
          claimed_by: string | null
          committed_last_day: string | null
          created_at: string
          cycle_days: number
          days_in_market: number | null
          designated_at: string | null
          designated_to: string | null
          designation_status: string
          do_not_call: boolean
          email: string | null
          first_name: string | null
          former_manager_name: string | null
          freed_at: string | null
          freed_by: string | null
          full_name: string
          hold: boolean
          id: string
          last_contact_at: string | null
          last_name: string | null
          next_call_at: string | null
          notes: string | null
          phone: string | null
          profile_id: string | null
          profile_snapshot: Json | null
          recruiter_name: string | null
          rep_year: string | null
          rev_per_day: number | null
          role_title: string | null
          roster_status: string
          season_revenue: number | null
          sheet_row: Json | null
          signed_2027: boolean | null
          source: string
          stage: string
          start_date: string | null
          system: string | null
          tags: string[]
          team_name: string | null
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          bucket?: string
          call_count?: number
          claimed_at?: string | null
          claimed_by?: string | null
          committed_last_day?: string | null
          created_at?: string
          cycle_days?: number
          days_in_market?: number | null
          designated_at?: string | null
          designated_to?: string | null
          designation_status?: string
          do_not_call?: boolean
          email?: string | null
          first_name?: string | null
          former_manager_name?: string | null
          freed_at?: string | null
          freed_by?: string | null
          full_name: string
          hold?: boolean
          id?: string
          last_contact_at?: string | null
          last_name?: string | null
          next_call_at?: string | null
          notes?: string | null
          phone?: string | null
          profile_id?: string | null
          profile_snapshot?: Json | null
          recruiter_name?: string | null
          rep_year?: string | null
          rev_per_day?: number | null
          role_title?: string | null
          roster_status?: string
          season_revenue?: number | null
          sheet_row?: Json | null
          signed_2027?: boolean | null
          source?: string
          stage?: string
          start_date?: string | null
          system?: string | null
          tags?: string[]
          team_name?: string | null
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          bucket?: string
          call_count?: number
          claimed_at?: string | null
          claimed_by?: string | null
          committed_last_day?: string | null
          created_at?: string
          cycle_days?: number
          days_in_market?: number | null
          designated_at?: string | null
          designated_to?: string | null
          designation_status?: string
          do_not_call?: boolean
          email?: string | null
          first_name?: string | null
          former_manager_name?: string | null
          freed_at?: string | null
          freed_by?: string | null
          full_name?: string
          hold?: boolean
          id?: string
          last_contact_at?: string | null
          last_name?: string | null
          next_call_at?: string | null
          notes?: string | null
          phone?: string | null
          profile_id?: string | null
          profile_snapshot?: Json | null
          recruiter_name?: string | null
          rep_year?: string | null
          rev_per_day?: number | null
          role_title?: string | null
          roster_status?: string
          season_revenue?: number | null
          sheet_row?: Json | null
          signed_2027?: boolean | null
          source?: string
          stage?: string
          start_date?: string | null
          system?: string | null
          tags?: string[]
          team_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_leads_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_numbers: {
        Row: {
          created_at: string | null
          created_by: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          label: string | null
          name: string
          phone: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          name: string
          phone: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          label?: string | null
          name?: string
          phone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pitch_approval_requests: {
        Row: {
          attempt_number: number | null
          created_at: string | null
          id: string
          lesson_id: string | null
          manager_feedback: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          user_id: string
          video_url: string
        }
        Insert: {
          attempt_number?: number | null
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          manager_feedback?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          user_id: string
          video_url: string
        }
        Update: {
          attempt_number?: number | null
          created_at?: string | null
          id?: string
          lesson_id?: string | null
          manager_feedback?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          user_id?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "pitch_approval_requests_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "training_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_entries: {
        Row: {
          body: string
          created_at: string
          followup: string | null
          id: string
          kind: string
          market: string | null
          meta: Json
          published: boolean
          sort_order: number
          tags: string[]
          title: string
          updated_at: string
          updated_by: string | null
          vertical: string
        }
        Insert: {
          body?: string
          created_at?: string
          followup?: string | null
          id?: string
          kind: string
          market?: string | null
          meta?: Json
          published?: boolean
          sort_order?: number
          tags?: string[]
          title: string
          updated_at?: string
          updated_by?: string | null
          vertical?: string
        }
        Update: {
          body?: string
          created_at?: string
          followup?: string | null
          id?: string
          kind?: string
          market?: string | null
          meta?: Json
          published?: boolean
          sort_order?: number
          tags?: string[]
          title?: string
          updated_at?: string
          updated_by?: string | null
          vertical?: string
        }
        Relationships: []
      }
      point_events: {
        Row: {
          category: string
          created_at: string | null
          id: string
          metadata: Json | null
          points: number
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          points: number
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          points?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accepting_new_reps: boolean
          active_vertical: string | null
          alumni: boolean
          appearance: string
          approved: boolean | null
          archived: boolean
          archived_at: string | null
          archived_reason: string | null
          avatar_url: string | null
          calendly_url: string | null
          can_recruit: boolean
          commitment_terms: string | null
          committed_last_day: string | null
          created_at: string | null
          cumulative_points: number | null
          departure_reason: string | null
          departure_type: string | null
          direct_manager: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          experience: Database["public"]["Enums"]["experience_level"] | null
          full_name: string
          hometown: string | null
          id: string
          is_active_now: boolean | null
          ladder_rung_override: number | null
          last_active_at: string | null
          last_day_worked: string | null
          last_login_at: string | null
          last_seen_release: string | null
          last_sweep_at: string | null
          last_sweep_by: string | null
          legacy_points_snapshot: number | null
          manager_id: string | null
          manager_intro: string | null
          mentee_capacity: number | null
          next_year_notes: string | null
          next_year_status: string | null
          next_year_status_at: string | null
          next_year_updated_by: string | null
          nickname: string | null
          office_id: string | null
          office_name: string | null
          onboarding_status: string | null
          organization: string | null
          otp_verified: boolean | null
          password_changed: boolean | null
          phone: string | null
          phone_visibility: Database["public"]["Enums"]["phone_visibility"]
          pillar_slug: string | null
          pre_archive_status: Database["public"]["Enums"]["user_status"] | null
          rank_id: string | null
          recruited_by_name: string | null
          recruited_by_user_id: string | null
          recruiter: string | null
          recruiter_id: string | null
          referred_by: string | null
          region: string | null
          region_id: string | null
          rep_year: string | null
          revenue_goal: number | null
          revenue_to_date: number | null
          runs_vertical: boolean
          shirt_size: string | null
          showed_up_date: string | null
          status: Database["public"]["Enums"]["user_status"] | null
          status_detail: string | null
          team_id: string | null
          time_this_week_minutes: number | null
          timezone: string | null
          tour_completed: boolean | null
          updated_at: string | null
          user_id: string
          vertical: string
          week_start: string | null
          weekly_goal: number | null
        }
        Insert: {
          accepting_new_reps?: boolean
          active_vertical?: string | null
          alumni?: boolean
          appearance?: string
          approved?: boolean | null
          archived?: boolean
          archived_at?: string | null
          archived_reason?: string | null
          avatar_url?: string | null
          calendly_url?: string | null
          can_recruit?: boolean
          commitment_terms?: string | null
          committed_last_day?: string | null
          created_at?: string | null
          cumulative_points?: number | null
          departure_reason?: string | null
          departure_type?: string | null
          direct_manager?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          experience?: Database["public"]["Enums"]["experience_level"] | null
          full_name: string
          hometown?: string | null
          id?: string
          is_active_now?: boolean | null
          ladder_rung_override?: number | null
          last_active_at?: string | null
          last_day_worked?: string | null
          last_login_at?: string | null
          last_seen_release?: string | null
          last_sweep_at?: string | null
          last_sweep_by?: string | null
          legacy_points_snapshot?: number | null
          manager_id?: string | null
          manager_intro?: string | null
          mentee_capacity?: number | null
          next_year_notes?: string | null
          next_year_status?: string | null
          next_year_status_at?: string | null
          next_year_updated_by?: string | null
          nickname?: string | null
          office_id?: string | null
          office_name?: string | null
          onboarding_status?: string | null
          organization?: string | null
          otp_verified?: boolean | null
          password_changed?: boolean | null
          phone?: string | null
          phone_visibility?: Database["public"]["Enums"]["phone_visibility"]
          pillar_slug?: string | null
          pre_archive_status?: Database["public"]["Enums"]["user_status"] | null
          rank_id?: string | null
          recruited_by_name?: string | null
          recruited_by_user_id?: string | null
          recruiter?: string | null
          recruiter_id?: string | null
          referred_by?: string | null
          region?: string | null
          region_id?: string | null
          rep_year?: string | null
          revenue_goal?: number | null
          revenue_to_date?: number | null
          runs_vertical?: boolean
          shirt_size?: string | null
          showed_up_date?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          status_detail?: string | null
          team_id?: string | null
          time_this_week_minutes?: number | null
          timezone?: string | null
          tour_completed?: boolean | null
          updated_at?: string | null
          user_id: string
          vertical?: string
          week_start?: string | null
          weekly_goal?: number | null
        }
        Update: {
          accepting_new_reps?: boolean
          active_vertical?: string | null
          alumni?: boolean
          appearance?: string
          approved?: boolean | null
          archived?: boolean
          archived_at?: string | null
          archived_reason?: string | null
          avatar_url?: string | null
          calendly_url?: string | null
          can_recruit?: boolean
          commitment_terms?: string | null
          committed_last_day?: string | null
          created_at?: string | null
          cumulative_points?: number | null
          departure_reason?: string | null
          departure_type?: string | null
          direct_manager?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          experience?: Database["public"]["Enums"]["experience_level"] | null
          full_name?: string
          hometown?: string | null
          id?: string
          is_active_now?: boolean | null
          ladder_rung_override?: number | null
          last_active_at?: string | null
          last_day_worked?: string | null
          last_login_at?: string | null
          last_seen_release?: string | null
          last_sweep_at?: string | null
          last_sweep_by?: string | null
          legacy_points_snapshot?: number | null
          manager_id?: string | null
          manager_intro?: string | null
          mentee_capacity?: number | null
          next_year_notes?: string | null
          next_year_status?: string | null
          next_year_status_at?: string | null
          next_year_updated_by?: string | null
          nickname?: string | null
          office_id?: string | null
          office_name?: string | null
          onboarding_status?: string | null
          organization?: string | null
          otp_verified?: boolean | null
          password_changed?: boolean | null
          phone?: string | null
          phone_visibility?: Database["public"]["Enums"]["phone_visibility"]
          pillar_slug?: string | null
          pre_archive_status?: Database["public"]["Enums"]["user_status"] | null
          rank_id?: string | null
          recruited_by_name?: string | null
          recruited_by_user_id?: string | null
          recruiter?: string | null
          recruiter_id?: string | null
          referred_by?: string | null
          region?: string | null
          region_id?: string | null
          rep_year?: string | null
          revenue_goal?: number | null
          revenue_to_date?: number | null
          runs_vertical?: boolean
          shirt_size?: string | null
          showed_up_date?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          status_detail?: string | null
          team_id?: string | null
          time_this_week_minutes?: number | null
          timezone?: string | null
          tour_completed?: boolean | null
          updated_at?: string | null
          user_id?: string
          vertical?: string
          week_start?: string | null
          weekly_goal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "profiles_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_rank_id_fkey"
            columns: ["rank_id"]
            isOneToOne: false
            referencedRelation: "ranks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_recruiter_id_fkey"
            columns: ["recruiter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "profiles_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      public_calc_chips: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          label: string | null
          updated_at: string
          value: number
          vertical: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          label?: string | null
          updated_at?: string
          value: number
          vertical: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          label?: string | null
          updated_at?: string
          value?: number
          vertical?: string
        }
        Relationships: []
      }
      public_counter_cache: {
        Row: {
          active_reps: number
          id: boolean
          refreshed_at: string
          signed_season: number
        }
        Insert: {
          active_reps?: number
          id?: boolean
          refreshed_at?: string
          signed_season?: number
        }
        Update: {
          active_reps?: number
          id?: boolean
          refreshed_at?: string
          signed_season?: number
        }
        Relationships: []
      }
      public_pay_bands: {
        Row: {
          created_at: string
          display_order: number
          id: string
          max_revenue: number | null
          min_revenue: number
          rate: number
          scale_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          max_revenue?: number | null
          min_revenue: number
          rate: number
          scale_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          max_revenue?: number | null
          min_revenue?: number
          rate?: number
          scale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_pay_bands_scale_id_fkey"
            columns: ["scale_id"]
            isOneToOne: false
            referencedRelation: "public_pay_scales"
            referencedColumns: ["id"]
          },
        ]
      }
      public_pay_scales: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key: string
          label: string
          updated_at: string
          vertical: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key: string
          label: string
          updated_at?: string
          vertical?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key?: string
          label?: string
          updated_at?: string
          vertical?: string
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          correct_answer: string | null
          created_at: string | null
          display_order: number | null
          explanation: string | null
          id: string
          lesson_id: string
          options: Json | null
          question_text: string
          question_type: string
        }
        Insert: {
          correct_answer?: string | null
          created_at?: string | null
          display_order?: number | null
          explanation?: string | null
          id?: string
          lesson_id: string
          options?: Json | null
          question_text: string
          question_type: string
        }
        Update: {
          correct_answer?: string | null
          created_at?: string | null
          display_order?: number | null
          explanation?: string | null
          id?: string
          lesson_id?: string
          options?: Json | null
          question_text?: string
          question_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "training_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      rank_requirements: {
        Row: {
          confirmed: boolean
          created_at: string
          description: string | null
          from_rank_id: string
          id: string
          rule_type: string
          source: string | null
          updated_at: string
          value: number | null
          vertical: string | null
          window_weeks: number | null
        }
        Insert: {
          confirmed?: boolean
          created_at?: string
          description?: string | null
          from_rank_id: string
          id?: string
          rule_type: string
          source?: string | null
          updated_at?: string
          value?: number | null
          vertical?: string | null
          window_weeks?: number | null
        }
        Update: {
          confirmed?: boolean
          created_at?: string
          description?: string | null
          from_rank_id?: string
          id?: string
          rule_type?: string
          source?: string | null
          updated_at?: string
          value?: number | null
          vertical?: string | null
          window_weeks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rank_requirements_from_rank_id_fkey"
            columns: ["from_rank_id"]
            isOneToOne: false
            referencedRelation: "ranks"
            referencedColumns: ["id"]
          },
        ]
      }
      rank_stacks: {
        Row: {
          carrier_id: string | null
          confirmed: boolean
          created_at: string
          id: string
          label: string | null
          rank_id: string | null
          sort_order: number | null
          source: string | null
          unit: string | null
          updated_at: string
          value: number | null
          vertical: string
        }
        Insert: {
          carrier_id?: string | null
          confirmed?: boolean
          created_at?: string
          id?: string
          label?: string | null
          rank_id?: string | null
          sort_order?: number | null
          source?: string | null
          unit?: string | null
          updated_at?: string
          value?: number | null
          vertical: string
        }
        Update: {
          carrier_id?: string | null
          confirmed?: boolean
          created_at?: string
          id?: string
          label?: string | null
          rank_id?: string | null
          sort_order?: number | null
          source?: string | null
          unit?: string | null
          updated_at?: string
          value?: number | null
          vertical?: string
        }
        Relationships: [
          {
            foreignKeyName: "rank_stacks_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rank_stacks_rank_id_fkey"
            columns: ["rank_id"]
            isOneToOne: false
            referencedRelation: "ranks"
            referencedColumns: ["id"]
          },
        ]
      }
      ranks: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          count: number
          created_at: string | null
          expires_at: string
          id: string
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          created_at?: string | null
          expires_at: string
          id?: string
          key: string
          window_start?: string
        }
        Update: {
          count?: number
          created_at?: string | null
          expires_at?: string
          id?: string
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      reactivation_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          reset_row_id: string | null
          status: string
          updated_at: string
          user_id: string
          vertical: string | null
          worked_under: string | null
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          reset_row_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
          vertical?: string | null
          worked_under?: string | null
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          reset_row_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          vertical?: string | null
          worked_under?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reactivation_requests_reset_row_id_fkey"
            columns: ["reset_row_id"]
            isOneToOne: false
            referencedRelation: "access_reset_2027"
            referencedColumns: ["id"]
          },
        ]
      }
      recruit_pipeline: {
        Row: {
          created_at: string
          email: string | null
          id: string
          interview_2_status: string | null
          interview_3_status: string | null
          next_follow_up: string | null
          notes: string | null
          onboarding_status: string | null
          owner_id: string
          phone: string | null
          position: string | null
          recruit_name: string
          source: string | null
          stage: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          interview_2_status?: string | null
          interview_3_status?: string | null
          next_follow_up?: string | null
          notes?: string | null
          onboarding_status?: string | null
          owner_id: string
          phone?: string | null
          position?: string | null
          recruit_name: string
          source?: string | null
          stage?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          interview_2_status?: string | null
          interview_3_status?: string | null
          next_follow_up?: string | null
          notes?: string | null
          onboarding_status?: string | null
          owner_id?: string
          phone?: string | null
          position?: string | null
          recruit_name?: string
          source?: string | null
          stage?: string
          updated_at?: string
        }
        Relationships: []
      }
      recruiting_faq: {
        Row: {
          answer: string | null
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          question: string
          updated_at: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          question?: string
          updated_at?: string
        }
        Relationships: []
      }
      recruiting_leads: {
        Row: {
          city: string | null
          claimed_at: string | null
          claimed_by: string | null
          contact_count: number
          created_at: string
          first_name: string
          id: string
          interest_reason: string | null
          last_activity_at: string | null
          last_contact_at: string | null
          last_sale_date: string | null
          notes: string | null
          outreach_task_id: string | null
          partner_id: string | null
          phone: string | null
          priority: boolean
          ref_code: string | null
          referrer_user_id: string | null
          revenue_total: number | null
          source_code: string | null
          source_profile_id: string | null
          source_type: string
          sourced_by: string | null
          status: string
          story: string | null
          vertical: string | null
          weeks_active: number | null
        }
        Insert: {
          city?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          contact_count?: number
          created_at?: string
          first_name: string
          id?: string
          interest_reason?: string | null
          last_activity_at?: string | null
          last_contact_at?: string | null
          last_sale_date?: string | null
          notes?: string | null
          outreach_task_id?: string | null
          partner_id?: string | null
          phone?: string | null
          priority?: boolean
          ref_code?: string | null
          referrer_user_id?: string | null
          revenue_total?: number | null
          source_code?: string | null
          source_profile_id?: string | null
          source_type?: string
          sourced_by?: string | null
          status?: string
          story?: string | null
          vertical?: string | null
          weeks_active?: number | null
        }
        Update: {
          city?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          contact_count?: number
          created_at?: string
          first_name?: string
          id?: string
          interest_reason?: string | null
          last_activity_at?: string | null
          last_contact_at?: string | null
          last_sale_date?: string | null
          notes?: string | null
          outreach_task_id?: string | null
          partner_id?: string | null
          phone?: string | null
          priority?: boolean
          ref_code?: string | null
          referrer_user_id?: string | null
          revenue_total?: number | null
          source_code?: string | null
          source_profile_id?: string | null
          source_type?: string
          sourced_by?: string | null
          status?: string
          story?: string | null
          vertical?: string | null
          weeks_active?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recruiting_leads_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      recruiting_ref_codes: {
        Row: {
          assigned_user_id: string | null
          code: string
          created_at: string
          created_by: string | null
          id: string
          label: string | null
        }
        Insert: {
          assigned_user_id?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
        }
        Update: {
          assigned_user_id?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
        }
        Relationships: []
      }
      recruiting_testimonials: {
        Row: {
          created_at: string
          display_order: number
          first_summer_figure: string | null
          id: string
          is_active: boolean
          office: string | null
          photo_url: string | null
          quote: string | null
          rep_name: string
          school: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          first_summer_figure?: string | null
          id?: string
          is_active?: boolean
          office?: string | null
          photo_url?: string | null
          quote?: string | null
          rep_name: string
          school?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          first_summer_figure?: string | null
          id?: string
          is_active?: boolean
          office?: string | null
          photo_url?: string | null
          quote?: string | null
          rep_name?: string
          school?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recruiting_timeline: {
        Row: {
          body: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          time_label: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          time_label?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          time_label?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      regions: {
        Row: {
          accepting_new: boolean
          active: boolean
          capacity: number | null
          created_at: string
          id: string
          intro: string | null
          lead_user_id: string | null
          name: string
          updated_at: string
          vertical: string
        }
        Insert: {
          accepting_new?: boolean
          active?: boolean
          capacity?: number | null
          created_at?: string
          id?: string
          intro?: string | null
          lead_user_id?: string | null
          name: string
          updated_at?: string
          vertical: string
        }
        Update: {
          accepting_new?: boolean
          active?: boolean
          capacity?: number | null
          created_at?: string
          id?: string
          intro?: string | null
          lead_user_id?: string | null
          name?: string
          updated_at?: string
          vertical?: string
        }
        Relationships: []
      }
      rep_ai_profiles: {
        Row: {
          concerns: Json
          created_at: string
          goals: string | null
          last_built_at: string | null
          source_count: number
          sources: Json
          strengths: Json
          summary: string | null
          tokens_used: number
          topics: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          concerns?: Json
          created_at?: string
          goals?: string | null
          last_built_at?: string | null
          source_count?: number
          sources?: Json
          strengths?: Json
          summary?: string | null
          tokens_used?: number
          topics?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          concerns?: Json
          created_at?: string
          goals?: string | null
          last_built_at?: string | null
          source_count?: number
          sources?: Json
          strengths?: Json
          summary?: string | null
          tokens_used?: number
          topics?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rep_commission: {
        Row: {
          active_revenue: number | null
          avg_account_value: number | null
          created_at: string
          id: string
          notes: string | null
          pay_scale: string
          rate_override: number | null
          signs: number
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          active_revenue?: number | null
          avg_account_value?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          pay_scale?: string
          rate_override?: number | null
          signs?: number
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          active_revenue?: number | null
          avg_account_value?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          pay_scale?: string
          rate_override?: number | null
          signs?: number
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rep_housing: {
        Row: {
          created_at: string
          id: string
          location: string | null
          monthly_cost: number | null
          notes: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          monthly_cost?: number | null
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          monthly_cost?: number | null
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rep_logistics: {
        Row: {
          arrival_date: string | null
          car_status: string
          created_at: string
          id: string
          notes: string | null
          travel_status: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          arrival_date?: string | null
          car_status?: string
          created_at?: string
          id?: string
          notes?: string | null
          travel_status?: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          arrival_date?: string | null
          car_status?: string
          created_at?: string
          id?: string
          notes?: string | null
          travel_status?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rep_revenue: {
        Row: {
          batch_id: string | null
          created_at: string
          entered_by: string | null
          id: string
          month: string
          pending_amount: number | null
          revenue: number
          serviced_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          entered_by?: string | null
          id?: string
          month: string
          pending_amount?: number | null
          revenue?: number
          serviced_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          entered_by?: string | null
          id?: string
          month?: string
          pending_amount?: number | null
          revenue?: number
          serviced_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rep_signups: {
        Row: {
          created_at: string
          id: string
          rep_email: string
          rep_name: string
          rep_phone: string
          signed_at: string
          signed_by: string | null
          source: string | null
          team_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          rep_email: string
          rep_name: string
          rep_phone: string
          signed_at?: string
          signed_by?: string | null
          source?: string | null
          team_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          rep_email?: string
          rep_name?: string
          rep_phone?: string
          signed_at?: string
          signed_by?: string | null
          source?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rep_signups_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      rep_triage: {
        Row: {
          bucket: string
          created_at: string
          id: string
          moved_at: string
          moved_by: string | null
          note: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bucket?: string
          created_at?: string
          id?: string
          moved_at?: string
          moved_by?: string | null
          note?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bucket?: string
          created_at?: string
          id?: string
          moved_at?: string
          moved_by?: string | null
          note?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rep_vertical_enrollments: {
        Row: {
          activated_at: string | null
          applied_at: string | null
          approved_at: string | null
          carrier_id: string | null
          created_at: string
          current_step: number
          id: string
          paired_manager: string | null
          partner_id: string | null
          referrer_user_id: string | null
          region_id: string | null
          reject_reason: string | null
          rejected_at: string | null
          source_code: string | null
          source_type: string
          sourced_by: string
          stack_source: string
          start_date: string | null
          status: string
          updated_at: string
          user_id: string
          vertical: string
        }
        Insert: {
          activated_at?: string | null
          applied_at?: string | null
          approved_at?: string | null
          carrier_id?: string | null
          created_at?: string
          current_step?: number
          id?: string
          paired_manager?: string | null
          partner_id?: string | null
          referrer_user_id?: string | null
          region_id?: string | null
          reject_reason?: string | null
          rejected_at?: string | null
          source_code?: string | null
          source_type?: string
          sourced_by?: string
          stack_source?: string
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
          vertical: string
        }
        Update: {
          activated_at?: string | null
          applied_at?: string | null
          approved_at?: string | null
          carrier_id?: string | null
          created_at?: string
          current_step?: number
          id?: string
          paired_manager?: string | null
          partner_id?: string | null
          referrer_user_id?: string | null
          region_id?: string | null
          reject_reason?: string | null
          rejected_at?: string | null
          source_code?: string | null
          source_type?: string
          sourced_by?: string
          stack_source?: string
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          vertical?: string
        }
        Relationships: [
          {
            foreignKeyName: "rep_vertical_enrollments_carrier_id_fkey"
            columns: ["carrier_id"]
            isOneToOne: false
            referencedRelation: "carriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rep_vertical_enrollments_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rep_vertical_enrollments_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rep_vertical_enrollments_vertical_fkey"
            columns: ["vertical"]
            isOneToOne: false
            referencedRelation: "vertical_paths"
            referencedColumns: ["vertical"]
          },
        ]
      }
      revenue_import_batches: {
        Row: {
          committed_at: string | null
          committed_rows: Json | null
          created_at: string
          created_by: string
          extracted: Json
          id: string
          kind: string
          note: string | null
          period_label: string | null
          prior_rows: Json
          status: string
          updated_at: string
        }
        Insert: {
          committed_at?: string | null
          committed_rows?: Json | null
          created_at?: string
          created_by: string
          extracted?: Json
          id?: string
          kind?: string
          note?: string | null
          period_label?: string | null
          prior_rows?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          committed_at?: string | null
          committed_rows?: Json | null
          created_at?: string
          created_by?: string
          extracted?: Json
          id?: string
          kind?: string
          note?: string | null
          period_label?: string | null
          prior_rows?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      revenue_import_images: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          storage_path: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          storage_path: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_import_images_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "revenue_import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_log: {
        Row: {
          city: string | null
          created_at: string
          customer_first: string | null
          frequency: string | null
          id: string
          initial: number | null
          notes: string | null
          plan: string | null
          reconciled: boolean
          recurring: number | null
          sold_at: string
          source: string
          user_id: string
          vertical: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          customer_first?: string | null
          frequency?: string | null
          id?: string
          initial?: number | null
          notes?: string | null
          plan?: string | null
          reconciled?: boolean
          recurring?: number | null
          sold_at?: string
          source?: string
          user_id: string
          vertical?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          customer_first?: string | null
          frequency?: string | null
          id?: string
          initial?: number | null
          notes?: string | null
          plan?: string | null
          reconciled?: boolean
          recurring?: number | null
          sold_at?: string
          source?: string
          user_id?: string
          vertical?: string
        }
        Relationships: []
      }
      schedule_items: {
        Row: {
          created_at: string | null
          day_of_week: number
          description: string | null
          id: string
          is_active: boolean | null
          target_role: Database["public"]["Enums"]["app_role"]
          time_pst: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          target_role: Database["public"]["Enums"]["app_role"]
          time_pst?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          target_role?: Database["public"]["Enums"]["app_role"]
          time_pst?: string | null
          title?: string
        }
        Relationships: []
      }
      scheduling_requests: {
        Row: {
          chosen_time: string | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          form_type: string
          id: string
          is_recurring: boolean | null
          notes: string | null
          parent_request_id: string | null
          proposed_times: Json
          recipient_id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          chosen_time?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          form_type?: string
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          parent_request_id?: string | null
          proposed_times?: Json
          recipient_id: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          chosen_time?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          form_type?: string
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          parent_request_id?: string | null
          proposed_times?: Json
          recipient_id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduling_requests_parent_request_id_fkey"
            columns: ["parent_request_id"]
            isOneToOne: false
            referencedRelation: "scheduling_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      scripts: {
        Row: {
          body: string
          category: string
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          is_active: boolean
          title: string
          updated_at: string
          vertical: string | null
        }
        Insert: {
          body?: string
          category: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
          vertical?: string | null
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
          vertical?: string | null
        }
        Relationships: []
      }
      season_checklist_items: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          season_id: string | null
          sort_order: number
          updated_at: string
          vertical: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          season_id?: string | null
          sort_order?: number
          updated_at?: string
          vertical?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          season_id?: string | null
          sort_order?: number
          updated_at?: string
          vertical?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "season_checklist_items_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      season_results: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          metric: string
          rank: number
          season_id: string
          user_id: string
          value: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          metric: string
          rank: number
          season_id: string
          user_id: string
          value?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          metric?: string
          rank?: number
          season_id?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "season_results_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          ends_on: string
          housing_notes: string | null
          id: string
          is_active: boolean
          name: string
          starts_on: string
          travel_notes: string | null
        }
        Insert: {
          created_at?: string
          ends_on: string
          housing_notes?: string | null
          id?: string
          is_active?: boolean
          name: string
          starts_on: string
          travel_notes?: string | null
        }
        Update: {
          created_at?: string
          ends_on?: string
          housing_notes?: string | null
          id?: string
          is_active?: boolean
          name?: string
          starts_on?: string
          travel_notes?: string | null
        }
        Relationships: []
      }
      signup_logs: {
        Row: {
          direct_manager: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string
          role: string
          signed_up_at: string | null
          user_id: string | null
        }
        Insert: {
          direct_manager: string
          email: string
          first_name: string
          id?: string
          last_name: string
          phone: string
          role: string
          signed_up_at?: string | null
          user_id?: string | null
        }
        Update: {
          direct_manager?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string
          role?: string
          signed_up_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      streak_breaks: {
        Row: {
          acknowledged: boolean
          broke_at: string
          created_at: string
          id: string
          manager_user_id: string | null
          streak_count: number
          team_id: string | null
          user_id: string
        }
        Insert: {
          acknowledged?: boolean
          broke_at?: string
          created_at?: string
          id?: string
          manager_user_id?: string | null
          streak_count?: number
          team_id?: string | null
          user_id: string
        }
        Update: {
          acknowledged?: boolean
          broke_at?: string
          created_at?: string
          id?: string
          manager_user_id?: string | null
          streak_count?: number
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "streak_breaks_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      sweep_sessions: {
        Row: {
          actor_id: string
          created_at: string
          filter: Json
          id: string
          last_action_at: string
          resolved_count: number
          started_at: string
          updated_at: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          filter?: Json
          id?: string
          last_action_at?: string
          resolved_count?: number
          started_at?: string
          updated_at?: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          filter?: Json
          id?: string
          last_action_at?: string
          resolved_count?: number
          started_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_lead_applications: {
        Row: {
          availability: string | null
          created_at: string
          id: string
          prior_results: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
          vertical: string
          why: string
        }
        Insert: {
          availability?: string | null
          created_at?: string
          id?: string
          prior_results?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
          vertical: string
          why: string
        }
        Update: {
          availability?: string | null
          created_at?: string
          id?: string
          prior_results?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          vertical?: string
          why?: string
        }
        Relationships: []
      }
      team_notifications: {
        Row: {
          created_at: string
          dismissed_by_users: string[] | null
          expires_at: string
          id: string
          new_rep_email: string | null
          new_rep_name: string
          new_rep_phone: string | null
          signer_name: string
          signer_user_id: string
          team_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          dismissed_by_users?: string[] | null
          expires_at: string
          id?: string
          new_rep_email?: string | null
          new_rep_name: string
          new_rep_phone?: string | null
          signer_name: string
          signer_user_id: string
          team_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          dismissed_by_users?: string[] | null
          expires_at?: string
          id?: string
          new_rep_email?: string | null
          new_rep_name?: string
          new_rep_phone?: string | null
          signer_name?: string
          signer_user_id?: string
          team_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_notifications_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_resources: {
        Row: {
          added_by: string | null
          created_at: string
          description: string | null
          id: string
          resource_name: string
          resource_type: string
          resource_url: string
          team_id: string
          updated_at: string | null
          vertical: string | null
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          resource_name: string
          resource_type: string
          resource_url: string
          team_id: string
          updated_at?: string | null
          vertical?: string | null
        }
        Update: {
          added_by?: string | null
          created_at?: string
          description?: string | null
          id?: string
          resource_name?: string
          resource_type?: string
          resource_url?: string
          team_id?: string
          updated_at?: string | null
          vertical?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_resources_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_scripts: {
        Row: {
          created_at: string
          id: string
          last_edited_at: string | null
          last_edited_by: string | null
          module: string
          script_content: string
          team_id: string
          vertical: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_edited_at?: string | null
          last_edited_by?: string | null
          module: string
          script_content?: string
          team_id: string
          vertical?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_edited_at?: string | null
          last_edited_by?: string | null
          module?: string
          script_content?: string
          team_id?: string
          vertical?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_scripts_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string | null
          id: string
          leader_id: string | null
          logo_url: string | null
          name: string
          retired: boolean
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          leader_id?: string | null
          logo_url?: string | null
          name: string
          retired?: boolean
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          leader_id?: string | null
          logo_url?: string | null
          name?: string
          retired?: boolean
          slug?: string
        }
        Relationships: []
      }
      todo_items: {
        Row: {
          assigned_by: string | null
          assigned_by_name: string | null
          completed_at: string | null
          created_at: string
          display_order: number
          due_date: string | null
          id: string
          is_completed: boolean
          priority: Database["public"]["Enums"]["todo_priority"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_by_name?: string | null
          completed_at?: string | null
          created_at?: string
          display_order?: number
          due_date?: string | null
          id?: string
          is_completed?: boolean
          priority?: Database["public"]["Enums"]["todo_priority"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          assigned_by_name?: string | null
          completed_at?: string | null
          created_at?: string
          display_order?: number
          due_date?: string | null
          id?: string
          is_completed?: boolean
          priority?: Database["public"]["Enums"]["todo_priority"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      training_content: {
        Row: {
          content_html: string | null
          content_key: string
          created_at: string | null
          display_order: number | null
          features_benefits: Json | null
          id: string
          is_active: boolean | null
          last_edited_at: string | null
          last_edited_by: string | null
          section_type: string
          title: string | null
          updated_at: string | null
          version: number | null
          video_url: string | null
        }
        Insert: {
          content_html?: string | null
          content_key: string
          created_at?: string | null
          display_order?: number | null
          features_benefits?: Json | null
          id?: string
          is_active?: boolean | null
          last_edited_at?: string | null
          last_edited_by?: string | null
          section_type: string
          title?: string | null
          updated_at?: string | null
          version?: number | null
          video_url?: string | null
        }
        Update: {
          content_html?: string | null
          content_key?: string
          created_at?: string | null
          display_order?: number | null
          features_benefits?: Json | null
          id?: string
          is_active?: boolean | null
          last_edited_at?: string | null
          last_edited_by?: string | null
          section_type?: string
          title?: string | null
          updated_at?: string | null
          version?: number | null
          video_url?: string | null
        }
        Relationships: []
      }
      training_content_versions: {
        Row: {
          change_description: string | null
          content_html_snapshot: string | null
          content_id: string | null
          edited_at: string | null
          edited_by: string | null
          features_benefits_snapshot: Json | null
          id: string
          version_number: number
          video_url_snapshot: string | null
        }
        Insert: {
          change_description?: string | null
          content_html_snapshot?: string | null
          content_id?: string | null
          edited_at?: string | null
          edited_by?: string | null
          features_benefits_snapshot?: Json | null
          id?: string
          version_number: number
          video_url_snapshot?: string | null
        }
        Update: {
          change_description?: string | null
          content_html_snapshot?: string | null
          content_id?: string | null
          edited_at?: string | null
          edited_by?: string | null
          features_benefits_snapshot?: Json | null
          id?: string
          version_number?: number
          video_url_snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_content_versions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "training_content"
            referencedColumns: ["id"]
          },
        ]
      }
      training_courses: {
        Row: {
          audience: string
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          slug: string
          target_role: Database["public"]["Enums"]["app_role"] | null
          title: string
          vertical: string | null
        }
        Insert: {
          audience?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          slug: string
          target_role?: Database["public"]["Enums"]["app_role"] | null
          title: string
          vertical?: string | null
        }
        Update: {
          audience?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          slug?: string
          target_role?: Database["public"]["Enums"]["app_role"] | null
          title?: string
          vertical?: string | null
        }
        Relationships: []
      }
      training_drills: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          is_active: boolean
          model_answer: string
          scenario: string
          updated_at: string
          vertical: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          model_answer: string
          scenario: string
          updated_at?: string
          vertical?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          model_answer?: string
          scenario?: string
          updated_at?: string
          vertical?: string | null
        }
        Relationships: []
      }
      training_lessons: {
        Row: {
          content: string
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          key_takeaways: string[] | null
          module_id: string
          requires_pitch_approval: boolean | null
          title: string
          video_url: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          key_takeaways?: string[] | null
          module_id: string
          requires_pitch_approval?: boolean | null
          title: string
          video_url?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          key_takeaways?: string[] | null
          module_id?: string
          requires_pitch_approval?: boolean | null
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      training_modules: {
        Row: {
          course_id: string
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      training_videos: {
        Row: {
          added_by: string | null
          category: string
          created_at: string | null
          description: string | null
          display_order: number | null
          duration_minutes: number | null
          id: string
          is_active: boolean | null
          is_required: boolean
          target_role: Database["public"]["Enums"]["app_role"] | null
          team_specific: boolean | null
          thumbnail_url: string | null
          title: string
          vertical: string | null
          video_url: string | null
          visible_to_teams: string[] | null
        }
        Insert: {
          added_by?: string | null
          category: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean
          target_role?: Database["public"]["Enums"]["app_role"] | null
          team_specific?: boolean | null
          thumbnail_url?: string | null
          title: string
          vertical?: string | null
          video_url?: string | null
          visible_to_teams?: string[] | null
        }
        Update: {
          added_by?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean
          target_role?: Database["public"]["Enums"]["app_role"] | null
          team_specific?: boolean | null
          thumbnail_url?: string | null
          title?: string
          vertical?: string | null
          video_url?: string | null
          visible_to_teams?: string[] | null
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_key: string
          granted_at: string
          granted_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          badge_key: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          badge_key?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_key_fkey"
            columns: ["badge_key"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["key"]
          },
        ]
      }
      user_notifications: {
        Row: {
          created_at: string | null
          deliver_after: string
          digested: boolean
          event_id: string | null
          id: string
          is_digest: boolean
          is_read: boolean | null
          link: string | null
          message: string
          title: string
          urgent: boolean
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deliver_after?: string
          digested?: boolean
          event_id?: string | null
          id?: string
          is_digest?: boolean
          is_read?: boolean | null
          link?: string | null
          message: string
          title: string
          urgent?: boolean
          user_id: string
        }
        Update: {
          created_at?: string | null
          deliver_after?: string
          digested?: boolean
          event_id?: string | null
          id?: string
          is_digest?: boolean
          is_read?: boolean | null
          link?: string | null
          message?: string
          title?: string
          urgent?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      user_priority_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          is_completed: boolean
          recurs_daily: boolean
          replaced_at: string | null
          source_form_id: string
          source_form_type: Database["public"]["Enums"]["source_form_type"]
          task_description: string
          task_title: string
          task_type: Database["public"]["Enums"]["priority_task_type"]
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          is_completed?: boolean
          recurs_daily?: boolean
          replaced_at?: string | null
          source_form_id: string
          source_form_type: Database["public"]["Enums"]["source_form_type"]
          task_description: string
          task_title: string
          task_type: Database["public"]["Enums"]["priority_task_type"]
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          is_completed?: boolean
          recurs_daily?: boolean
          replaced_at?: string | null
          source_form_id?: string
          source_form_type?: Database["public"]["Enums"]["source_form_type"]
          task_description?: string
          task_title?: string
          task_type?: Database["public"]["Enums"]["priority_task_type"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_training_achievements: {
        Row: {
          awarded_at: string
          badge_type: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          badge_type: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          badge_type?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      vertical_application_approvals: {
        Row: {
          application_id: string
          approver_user_id: string
          decided_at: string
          decision: string
          id: string
          note: string | null
        }
        Insert: {
          application_id: string
          approver_user_id: string
          decided_at?: string
          decision: string
          id?: string
          note?: string | null
        }
        Update: {
          application_id?: string
          approver_user_id?: string
          decided_at?: string
          decision?: string
          id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vertical_application_approvals_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "vertical_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      vertical_applications: {
        Row: {
          answers: Json
          created_at: string
          id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
          vertical: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
          vertical: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          vertical?: string
        }
        Relationships: [
          {
            foreignKeyName: "vertical_applications_vertical_fkey"
            columns: ["vertical"]
            isOneToOne: false
            referencedRelation: "verticals"
            referencedColumns: ["vertical"]
          },
        ]
      }
      vertical_paths: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          is_configured: boolean
          label: string
          public_how_it_works: string[] | null
          public_note: string | null
          updated_at: string
          vertical: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          is_configured?: boolean
          label: string
          public_how_it_works?: string[] | null
          public_note?: string | null
          updated_at?: string
          vertical: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          is_configured?: boolean
          label?: string
          public_how_it_works?: string[] | null
          public_note?: string | null
          updated_at?: string
          vertical?: string
        }
        Relationships: []
      }
      vertical_step_completions: {
        Row: {
          approved_by: string | null
          completed_at: string
          file_path: string | null
          id: string
          notes: string | null
          step_id: string
          user_id: string
          vertical: string
        }
        Insert: {
          approved_by?: string | null
          completed_at?: string
          file_path?: string | null
          id?: string
          notes?: string | null
          step_id: string
          user_id: string
          vertical: string
        }
        Update: {
          approved_by?: string | null
          completed_at?: string
          file_path?: string | null
          id?: string
          notes?: string | null
          step_id?: string
          user_id?: string
          vertical?: string
        }
        Relationships: [
          {
            foreignKeyName: "vertical_step_completions_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "vertical_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      vertical_steps: {
        Row: {
          auto_rule: string | null
          checklist: string[]
          course_id: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          link_url: string | null
          overdue_days: number
          step_type: string
          title: string
          updated_at: string
          vertical: string
        }
        Insert: {
          auto_rule?: string | null
          checklist?: string[]
          course_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          link_url?: string | null
          overdue_days?: number
          step_type?: string
          title: string
          updated_at?: string
          vertical: string
        }
        Update: {
          auto_rule?: string | null
          checklist?: string[]
          course_id?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          link_url?: string | null
          overdue_days?: number
          step_type?: string
          title?: string
          updated_at?: string
          vertical?: string
        }
        Relationships: [
          {
            foreignKeyName: "vertical_steps_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vertical_steps_vertical_fkey"
            columns: ["vertical"]
            isOneToOne: false
            referencedRelation: "vertical_paths"
            referencedColumns: ["vertical"]
          },
        ]
      }
      verticals: {
        Row: {
          accent_token: string
          created_at: string
          display_order: number
          name: string
          president_user_id: string | null
          public: boolean
          public_title: string | null
          required_approver_ids: string[]
          short_name: string
          slug: string
          status: string
          theme: Json
          unit: string
          updated_at: string
          vertical: string
        }
        Insert: {
          accent_token?: string
          created_at?: string
          display_order?: number
          name: string
          president_user_id?: string | null
          public?: boolean
          public_title?: string | null
          required_approver_ids?: string[]
          short_name: string
          slug: string
          status?: string
          theme?: Json
          unit: string
          updated_at?: string
          vertical: string
        }
        Update: {
          accent_token?: string
          created_at?: string
          display_order?: number
          name?: string
          president_user_id?: string | null
          public?: boolean
          public_title?: string | null
          required_approver_ids?: string[]
          short_name?: string
          slug?: string
          status?: string
          theme?: Json
          unit?: string
          updated_at?: string
          vertical?: string
        }
        Relationships: []
      }
      vet_leads: {
        Row: {
          best_time_to_call: string | null
          bid_requested: boolean
          created_at: string
          current_company: string | null
          email: string
          full_name: string
          id: string
          last_season_active_revenue: number | null
          markets: string | null
          notes: string | null
          phone: string
          source_code: string | null
          source_type: string | null
          status: string
          updated_at: string
          years_d2d: string | null
        }
        Insert: {
          best_time_to_call?: string | null
          bid_requested?: boolean
          created_at?: string
          current_company?: string | null
          email: string
          full_name: string
          id?: string
          last_season_active_revenue?: number | null
          markets?: string | null
          notes?: string | null
          phone: string
          source_code?: string | null
          source_type?: string | null
          status?: string
          updated_at?: string
          years_d2d?: string | null
        }
        Update: {
          best_time_to_call?: string | null
          bid_requested?: boolean
          created_at?: string
          current_company?: string | null
          email?: string
          full_name?: string
          id?: string
          last_season_active_revenue?: number | null
          markets?: string | null
          notes?: string | null
          phone?: string
          source_code?: string | null
          source_type?: string | null
          status?: string
          updated_at?: string
          years_d2d?: string | null
        }
        Relationships: []
      }
      video_bookmarks: {
        Row: {
          bookmarked_at: string | null
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          bookmarked_at?: string | null
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          bookmarked_at?: string | null
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_bookmarks_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "training_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_notes: {
        Row: {
          id: string
          notes: string | null
          updated_at: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          id?: string
          notes?: string | null
          updated_at?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          id?: string
          notes?: string | null
          updated_at?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_notes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "training_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_progress: {
        Row: {
          created_at: string | null
          duration: number | null
          id: string
          last_position: number | null
          user_id: string
          video_id: string
          watched: boolean | null
          watched_at: string | null
        }
        Insert: {
          created_at?: string | null
          duration?: number | null
          id?: string
          last_position?: number | null
          user_id: string
          video_id: string
          watched?: boolean | null
          watched_at?: string | null
        }
        Update: {
          created_at?: string | null
          duration?: number | null
          id?: string
          last_position?: number | null
          user_id?: string
          video_id?: string
          watched?: boolean | null
          watched_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_progress_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "training_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_watch_log: {
        Row: {
          id: string
          user_id: string
          video_id: string
          watch_duration_minutes: number | null
          watched_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          video_id: string
          watch_duration_minutes?: number | null
          watched_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          video_id?: string
          watch_duration_minutes?: number | null
          watched_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_watch_log_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "training_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      week_screen_views: {
        Row: {
          last_opened_at: string
          user_id: string
        }
        Insert: {
          last_opened_at?: string
          user_id: string
        }
        Update: {
          last_opened_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_awards: {
        Row: {
          created_at: string
          id: string
          payload: Json
          posted_at: string
          week_ending: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          posted_at?: string
          week_ending: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          posted_at?: string
          week_ending?: string
        }
        Relationships: []
      }
      weekly_one_on_ones_manager: {
        Row: {
          commitment: string | null
          completed_mission: string
          created_at: string
          focus_area: string | null
          gethawx_review: string
          id: string
          interview_forms_check: string
          interviewer_name: string
          manager_improvement: string
          manager_name: string
          manager_user_id: string | null
          obstacles_encountered: string
          obstacles_review: string
          recruit_goal: string
          rep_relationship: string
          submitted_at: string
          submitted_by: string
          system_utilization_rating: number
          team: string
          team_development: Json
          training_progress_check: string
          upcoming_events: string
          weekly_mission: string
        }
        Insert: {
          commitment?: string | null
          completed_mission: string
          created_at?: string
          focus_area?: string | null
          gethawx_review: string
          id?: string
          interview_forms_check: string
          interviewer_name: string
          manager_improvement: string
          manager_name: string
          manager_user_id?: string | null
          obstacles_encountered: string
          obstacles_review: string
          recruit_goal: string
          rep_relationship: string
          submitted_at?: string
          submitted_by: string
          system_utilization_rating: number
          team: string
          team_development?: Json
          training_progress_check: string
          upcoming_events: string
          weekly_mission: string
        }
        Update: {
          commitment?: string | null
          completed_mission?: string
          created_at?: string
          focus_area?: string | null
          gethawx_review?: string
          id?: string
          interview_forms_check?: string
          interviewer_name?: string
          manager_improvement?: string
          manager_name?: string
          manager_user_id?: string | null
          obstacles_encountered?: string
          obstacles_review?: string
          recruit_goal?: string
          rep_relationship?: string
          submitted_at?: string
          submitted_by?: string
          system_utilization_rating?: number
          team?: string
          team_development?: Json
          training_progress_check?: string
          upcoming_events?: string
          weekly_mission?: string
        }
        Relationships: []
      }
      weekly_one_on_ones_rookie: {
        Row: {
          big_win: string
          commitment: string | null
          completed_challenge: string
          created_at: string
          focus_area: string | null
          id: string
          manager_name: string
          pitch_work_needed: string
          rookie_name: string
          rookie_user_id: string | null
          submitted_at: string
          submitted_by: string
          team: string
          upcoming_activities: string
          week_description: string
          weekly_mission: string
        }
        Insert: {
          big_win: string
          commitment?: string | null
          completed_challenge: string
          created_at?: string
          focus_area?: string | null
          id?: string
          manager_name: string
          pitch_work_needed: string
          rookie_name: string
          rookie_user_id?: string | null
          submitted_at?: string
          submitted_by: string
          team: string
          upcoming_activities: string
          week_description: string
          weekly_mission: string
        }
        Update: {
          big_win?: string
          commitment?: string | null
          completed_challenge?: string
          created_at?: string
          focus_area?: string | null
          id?: string
          manager_name?: string
          pitch_work_needed?: string
          rookie_name?: string
          rookie_user_id?: string | null
          submitted_at?: string
          submitted_by?: string
          team?: string
          upcoming_activities?: string
          week_description?: string
          weekly_mission?: string
        }
        Relationships: []
      }
      weekly_reports: {
        Row: {
          created_at: string
          generated_at: string
          id: string
          payload: Json
          updated_at: string
          week_ending: string
        }
        Insert: {
          created_at?: string
          generated_at?: string
          id?: string
          payload?: Json
          updated_at?: string
          week_ending: string
        }
        Update: {
          created_at?: string
          generated_at?: string
          id?: string
          payload?: Json
          updated_at?: string
          week_ending?: string
        }
        Relationships: []
      }
      winback_contacts: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          note: string | null
          outcome: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          note?: string | null
          outcome: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          note?: string | null
          outcome?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "winback_contacts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "recruiting_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      winter_plans: {
        Row: {
          answer: string
          created_at: string
          id: string
          season_year: number
          updated_at: string
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          season_year?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          season_year?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      quiz_questions_safe: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string | null
          lesson_id: string | null
          options: Json | null
          question_text: string | null
          question_type: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string | null
          lesson_id?: string | null
          options?: Json | null
          question_text?: string | null
          question_type?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string | null
          lesson_id?: string | null
          options?: Json | null
          question_text?: string | null
          question_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "training_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      ack_announcement: { Args: { _post_id: string }; Returns: undefined }
      add_channel_members: {
        Args: { _ids: string[]; _slug: string }
        Returns: Json
      }
      add_manual_lead: {
        Args: {
          _city?: string
          _first_name: string
          _interest_reason?: string
          _notes?: string
          _phone?: string
        }
        Returns: Json
      }
      add_under_led_outreach: { Args: { _lead_id: string }; Returns: Json }
      admin_assign_lead: {
        Args: { _lead_id: string; _user_id: string }
        Returns: Json
      }
      admin_set_can_recruit: {
        Args: { _user_id: string; _value: boolean }
        Returns: boolean
      }
      admin_set_manager_link: {
        Args: { _manager_id: string; _user_id: string }
        Returns: undefined
      }
      admin_set_paired_manager: {
        Args: { _manager_id: string; _user_id: string; _vertical: string }
        Returns: Json
      }
      admin_set_person_region: {
        Args: { _region_id: string; _user_id: string }
        Returns: Json
      }
      admin_set_president: {
        Args: { _user_id: string; _vertical: string }
        Returns: Json
      }
      admin_set_rank: {
        Args: { _rank_id: string; _user_id: string }
        Returns: Json
      }
      admin_set_recruiter_role: {
        Args: { _on: boolean; _user_id: string }
        Returns: Json
      }
      admin_set_region_lead: {
        Args: { _region_id: string; _user_id: string }
        Returns: Json
      }
      admin_set_sourced_by: {
        Args: { _sourced_by: string; _user_id: string; _vertical: string }
        Returns: undefined
      }
      admin_set_stack_source: {
        Args: { _source: string; _user_id: string; _vertical: string }
        Returns: Json
      }
      admin_set_tier: {
        Args: { _tier: string; _user_id: string }
        Returns: string
      }
      admin_set_vertical_lead: {
        Args: { _is_lead: boolean; _user_id: string; _vertical: string }
        Returns: Json
      }
      answer_home_question: {
        Args: {
          _answer: string
          _period: string
          _question_id: string
          _skip?: boolean
        }
        Returns: undefined
      }
      applications_pulse: { Args: never; Returns: Json }
      apply_leaderboard_import: {
        Args: { _batch_id: string; _rows: Json }
        Returns: Json
      }
      apply_revenue_import: { Args: { _rows: Json }; Returns: Json }
      apply_run_team: {
        Args: {
          _availability: string
          _prior_results: string
          _vertical: string
          _why: string
        }
        Returns: Json
      }
      apply_to_vertical: {
        Args: { _answers?: Json; _vertical: string }
        Returns: Json
      }
      apply_winback_gold: { Args: { _rows: Json }; Returns: Json }
      approve_vertical_step: {
        Args: { _notes?: string; _step_id: string; _user_id: string }
        Returns: Json
      }
      archive_person: {
        Args: { _reason: string; _user_id: string }
        Returns: undefined
      }
      ask_summit_roster: { Args: { _uid: string }; Returns: Json }
      auto_pair: { Args: { _vertical: string }; Returns: Json }
      auto_sync_all_edges: { Args: never; Returns: Json }
      award_chat_message_points: {
        Args: { _content: string; _message_id?: string; _user_id: string }
        Returns: number
      }
      award_lesson_completion_points: {
        Args: { _lesson_id: string; _user_id: string }
        Returns: number
      }
      award_points_v2: {
        Args: {
          _category: string
          _metadata?: Json
          _points: number
          _user_id: string
        }
        Returns: number
      }
      award_quiz_bonus_points: {
        Args: { _lesson_id: string; _score: number; _user_id: string }
        Returns: number
      }
      award_reaction_points: {
        Args: {
          _author_user_id: string
          _message_id: string
          _reactor_user_id: string
        }
        Returns: undefined
      }
      award_training_points: {
        Args: { _points: number; _user_id: string }
        Returns: undefined
      }
      award_video_watch_points: {
        Args: { _user_id: string; _video_id: string }
        Returns: number
      }
      blitz_optin_counts: {
        Args: never
        Returns: {
          blitz_key: string
          i_am_in: boolean
          optin_count: number
        }[]
      }
      build_lead_snapshot: { Args: { _profile_id: string }; Returns: Json }
      can_chat_dm: { Args: { _a: string; _b: string }; Returns: boolean }
      can_find_person: { Args: { _target: string }; Returns: boolean }
      can_manage_channel_members: {
        Args: { _slug: string; _uid: string }
        Returns: boolean
      }
      can_read_channel: {
        Args: { _channel: string; _uid: string }
        Returns: boolean
      }
      can_see_phone: { Args: { _target: string }; Returns: boolean }
      can_set_channel_cover: {
        Args: { _slug: string; _uid: string }
        Returns: boolean
      }
      can_sweep_person: { Args: { _target: string }; Returns: boolean }
      can_view_event: {
        Args: { p_scope: string; p_team_id: string; p_user_id: string }
        Returns: boolean
      }
      can_view_person: { Args: { _user_id: string }; Returns: string }
      can_write_event: {
        Args: { _team_id: string; _uid: string }
        Returns: boolean
      }
      channel_member_options: {
        Args: { _q?: string; _slug?: string }
        Returns: Json
      }
      channel_read_mark: { Args: { _channel: string }; Returns: Json }
      chat_attachment_readable: {
        Args: { _object_name: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          p_key: string
          p_max_attempts: number
          p_window_seconds: number
        }
        Returns: boolean
      }
      claim_application: {
        Args: { _assignee?: string; _id: string }
        Returns: Json
      }
      claim_lead: { Args: { _lead_id: string }; Returns: Json }
      claim_winback: { Args: { _lead_id: string }; Returns: Json }
      company_timezone: { Args: never; Returns: string }
      complete_daily_drill: {
        Args: { _drill_id: string; _response: string; _timezone?: string }
        Returns: Json
      }
      complete_vertical_step: {
        Args: { _file_path?: string; _step_id: string }
        Returns: Json
      }
      compute_weekly_awards: {
        Args: { _from: string; _to: string }
        Returns: Json
      }
      compute_weekly_report: {
        Args: { _from: string; _to: string }
        Returns: Json
      }
      create_group_channel: {
        Args: { _cover?: string; _ids?: string[]; _label: string }
        Returns: Json
      }
      create_seat_invite: {
        Args: { _days?: number; _user_id: string }
        Returns: Json
      }
      cycle_stale_people_leads: { Args: never; Returns: Json }
      day_one_video_ids: { Args: never; Returns: string[] }
      decide_vertical_application: {
        Args: { _application_id: string; _decision: string; _note?: string }
        Returns: Json
      }
      decide_vertical_request: {
        Args: { _application_id: string; _decision: string; _note?: string }
        Returns: Json
      }
      delete_calendar_event: {
        Args: { p_event_id: string; p_series?: boolean }
        Returns: number
      }
      delete_chat_channel: { Args: { _slug: string }; Returns: Json }
      delete_chat_message: { Args: { _id: string }; Returns: Json }
      dismiss_reactivation_request: { Args: { _id: string }; Returns: Json }
      edit_chat_message: {
        Args: { _content: string; _id: string }
        Returns: Json
      }
      ensure_rep_ref_code: { Args: { _user_id: string }; Returns: string }
      event_card_meta: {
        Args: { _e: Database["public"]["Tables"]["calendar_events"]["Row"] }
        Returns: Json
      }
      event_series_cadence: {
        Args: { _e: Database["public"]["Tables"]["calendar_events"]["Row"] }
        Returns: string
      }
      event_target_channel: {
        Args: { _scope: string; _team_id: string }
        Returns: string
      }
      expand_event_series: { Args: { p_weeks?: number }; Returns: number }
      expire_stale_scheduling_requests: { Args: never; Returns: number }
      fiber_installs_total: { Args: { _user: string }; Returns: number }
      fiber_producing_reps: {
        Args: { _leader: string; _vertical: string }
        Returns: number
      }
      finalize_invite: {
        Args: { p_token: string; p_user_id: string }
        Returns: undefined
      }
      finalize_season: { Args: { _season_id: string }; Returns: undefined }
      finish_first_week: { Args: never; Returns: Json }
      first_week_json: { Args: { _target: string }; Returns: Json }
      gated_recruits: {
        Args: never
        Returns: {
          avatar_url: string
          done: number
          full_name: string
          last_active_at: string
          minutes: number
          pct: number
          total: number
          user_id: string
        }[]
      }
      generate_weekly_report: { Args: never; Returns: Json }
      get_access_reset_rows: {
        Args: { _search?: string }
        Returns: {
          direct_manager: string
          email: string
          full_name: string
          id: string
          last_active_at: string
          rank_name: string
          reason: string
          region_id: string
          request_id: string
          restored_at: string
          revenue_to_date: number
          roles: string[]
          status: string
          team_name: string
          user_id: string
          vertical: string
          was_archived: boolean
        }[]
      }
      get_action_cards: { Args: never; Returns: Json }
      get_all_time_leaderboard: {
        Args: { _limit?: number }
        Returns: {
          avatar_url: string
          chat_points: number
          current_streak: number
          full_name: string
          legacy_points: number
          lesson_points: number
          lessons_completed: number
          login_points: number
          manual_points: number
          new_event_points: number
          new_hours_points: number
          nickname: string
          one_on_one_points: number
          reaction_points: number
          streak_points: number
          team_name: string
          threshold_bonus: number
          total_points: number
          total_time_minutes: number
          user_id: string
          video_points: number
          videos_watched: number
        }[]
      }
      get_announcement_ack_status: { Args: { _post_id: string }; Returns: Json }
      get_announcement_seen_counts: { Args: never; Returns: Json }
      get_applications_awaiting_me: { Args: never; Returns: number }
      get_attendance_flags: {
        Args: never
        Returns: {
          missed_streak: number
          pct: number
          user_id: string
        }[]
      }
      get_attendance_summary: {
        Args: { p_user_id?: string }
        Returns: {
          expected: number
          missed_streak: number
          pct: number
          present: number
        }[]
      }
      get_audit_log: {
        Args: {
          _action?: string
          _days?: number
          _entity?: string
          _limit?: number
        }
        Returns: {
          action: string
          actor_name: string
          after_value: string
          before_value: string
          created_at: string
          entity_label: string
          entity_type: string
          field: string
          id: string
        }[]
      }
      get_badges_for_users: {
        Args: { _user_ids: string[] }
        Returns: {
          badge_key: string
          description: string
          granted_at: string
          icon: string
          kind: string
          name: string
          sort_order: number
          user_id: string
        }[]
      }
      get_channel_details: { Args: { _slug: string }; Returns: Json }
      get_channel_messages: {
        Args: { _before?: string; _channel: string; _limit?: number }
        Returns: Json
      }
      get_chat_channel_state: { Args: never; Returns: Json }
      get_command_analytics: { Args: never; Returns: Json }
      get_commitment_overview: { Args: never; Returns: Json }
      get_conversations: { Args: never; Returns: Json }
      get_current_leaderboard: {
        Args: never
        Returns: {
          avatar_url: string
          chat_points: number
          current_streak: number
          full_name: string
          hours_points: number
          lesson_points: number
          login_points: number
          manual_points: number
          nickname: string
          one_on_one_points: number
          rank: number
          reaction_points: number
          streak_points: number
          team_name: string
          threshold_bonus: number
          time_this_week_minutes: number
          total_points: number
          user_id: string
          video_points: number
        }[]
      }
      get_current_season: {
        Args: never
        Returns: {
          days_left: number
          ends_on: string
          id: string
          name: string
          starts_on: string
        }[]
      }
      get_daily_challenge: { Args: { _user_id: string }; Returns: Json }
      get_daily_drill: { Args: { _timezone?: string }; Returns: Json }
      get_data_active_counts: { Args: never; Returns: Json }
      get_data_gap_people: { Args: { _gap: string }; Returns: Json }
      get_data_health: { Args: never; Returns: Json }
      get_data_integrity_report: { Args: never; Returns: Json }
      get_data_person_lookup: { Args: { _q: string }; Returns: Json }
      get_data_under_led: { Args: never; Returns: Json }
      get_downline_from_edges: {
        Args: { _manager_user_id: string }
        Returns: {
          avatar_url: string
          depth: number
          direct_manager: string
          email: string
          full_name: string
          is_active_now: boolean
          last_active_at: string
          profile_id: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["user_status"]
          team_name: string
          time_this_week_minutes: number
          user_id: string
        }[]
      }
      get_eligible_managers: { Args: { _vertical: string }; Returns: Json }
      get_event_answer_columns: { Args: never; Returns: Json }
      get_event_checkin: {
        Args: { p_event_id: string }
        Returns: {
          full_name: string
          present: boolean
          rsvp: string
          team_name: string
          user_id: string
        }[]
      }
      get_event_rsvp_rollup: { Args: { _event_id: string }; Returns: Json }
      get_events_feed: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          created_by: string
          description: string
          end_date: string
          event_date: string
          event_kind: string
          going_count: number
          id: string
          is_series: boolean
          location: string
          my_rsvp: string
          present_count: number
          scope: string
          team_id: string
          team_name: string
          title: string
        }[]
      }
      get_fiber_leaderboard: {
        Args: { p_week_start?: string }
        Returns: {
          full_name: string
          installs: number
          rank: number
          user_id: string
        }[]
      }
      get_fiber_report: {
        Args: { _carrier_id?: string; _region_id?: string; _weeks?: number }
        Returns: Json
      }
      get_fiber_stack_table: { Args: never; Returns: Json }
      get_fiber_winter_interest: {
        Args: never
        Returns: {
          answered_at: string
          application_status: string
          full_name: string
          user_id: string
        }[]
      }
      get_finishing_soon: { Args: { _days?: number }; Returns: Json }
      get_first_week: { Args: { _target?: string }; Returns: Json }
      get_first_week_rows: { Args: never; Returns: Json }
      get_global_leaderboard:
        | {
            Args: { _limit?: number; _view_role?: string }
            Returns: {
              avatar_url: string
              avg_quiz_score: number
              full_name: string
              hours_this_week: number
              is_active_today: boolean
              lessons_completed: number
              nickname: string
              progress_pct: number
              streak_days: number
              total_lessons: number
              total_points: number
              user_id: string
            }[]
          }
        | {
            Args: { _limit?: number; _mode?: string; _view_role: string }
            Returns: {
              avatar_url: string
              avg_quiz_score: number
              full_name: string
              hours_this_week: number
              is_active_today: boolean
              lessons_completed: number
              nickname: string
              progress_pct: number
              streak_days: number
              total_lessons: number
              total_points: number
              user_id: string
            }[]
          }
      get_hall_of_fame: {
        Args: never
        Returns: {
          avatar_url: string
          ends_on: string
          full_name: string
          metric: string
          rank: number
          season_id: string
          season_name: string
          starts_on: string
          user_id: string
          value: number
        }[]
      }
      get_home_snapshot: { Args: never; Returns: Json }
      get_import_batches: { Args: { _kind: string }; Returns: Json }
      get_incentive_progress: {
        Args: never
        Returns: {
          ends_on: string
          id: string
          metric: string
          my_value: number
          name: string
          prize_note: string
          target: number
        }[]
      }
      get_incomplete_profiles: {
        Args: never
        Returns: {
          full_name: string
          missing: string[]
          user_id: string
        }[]
      }
      get_industry_hub: { Args: never; Returns: Json }
      get_ladder: { Args: never; Returns: Json }
      get_lead_board: {
        Args: never
        Returns: {
          city: string
          created_at: string
          first_name: string
          id: string
          interest_reason: string
          ref_code: string
        }[]
      }
      get_leader_scorecard: {
        Args: { _office?: string; _season_id?: string; _user_id: string }
        Returns: Json
      }
      get_leaders_list: { Args: never; Returns: Json }
      get_manager_directory: { Args: never; Returns: Json }
      get_manager_week: { Args: { _manager?: string }; Returns: Json }
      get_missed_meeting_flags: {
        Args: never
        Returns: {
          missed_streak: number
          user_id: string
        }[]
      }
      get_money_sources: { Args: never; Returns: Json }
      get_my_access_state: { Args: never; Returns: Json }
      get_my_leads: {
        Args: never
        Returns: {
          city: string
          claimed_at: string
          created_at: string
          first_name: string
          id: string
          interest_reason: string
          last_activity_at: string
          notes: string
          phone: string
          ref_code: string
          status: string
        }[]
      }
      get_my_mentees: { Args: never; Returns: Json }
      get_my_money: { Args: never; Returns: Json }
      get_my_money_summary: { Args: { _target?: string }; Returns: Json }
      get_my_pairing_request: { Args: { _vertical: string }; Returns: Json }
      get_my_pairing_requests: { Args: never; Returns: Json }
      get_my_points_breakdown: { Args: { _user_id: string }; Returns: Json }
      get_my_ref_code: { Args: never; Returns: string }
      get_my_revenue: { Args: never; Returns: Json }
      get_my_spread: { Args: never; Returns: Json }
      get_my_vertical_path: { Args: { _vertical: string }; Returns: Json }
      get_my_winter_plan: { Args: never; Returns: Json }
      get_my_workspaces: { Args: never; Returns: Json }
      get_new_lead_count: { Args: never; Returns: number }
      get_off_season_report: { Args: never; Returns: Json }
      get_open_home_question: { Args: never; Returns: Json }
      get_pairings: {
        Args: { _manager?: string; _status?: string; _vertical?: string }
        Returns: Json
      }
      get_partner_referrals: { Args: { p_partner_id: string }; Returns: Json }
      get_pending_vertical_approvals: { Args: never; Returns: Json }
      get_person_event_answers: {
        Args: { _limit?: number; _user_id: string }
        Returns: Json
      }
      get_person_profile: { Args: { _user_id: string }; Returns: Json }
      get_person_threads: { Args: { _user_id: string }; Returns: Json }
      get_person_time_split: { Args: { _user_id: string }; Returns: Json }
      get_pillar_team_members: {
        Args: { _pillar_user_id: string }
        Returns: {
          avatar_url: string
          direct_manager: string
          email: string
          full_name: string
          is_active_now: boolean
          last_active_at: string
          profile_id: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["user_status"]
          team_name: string
          time_this_week_minutes: number
          user_id: string
        }[]
      }
      get_prep_commitment: {
        Args: { _mode?: string; _user_id: string }
        Returns: Json
      }
      get_profile_contact: {
        Args: { _user_id: string }
        Returns: {
          calendly_url: string
          email: string
          phone: string
          revenue_goal: number
          user_id: string
        }[]
      }
      get_public_calc: { Args: never; Returns: Json }
      get_public_counters: { Args: never; Returns: Json }
      get_public_cover_content: { Args: never; Returns: Json }
      get_public_fiber_stacks: { Args: never; Returns: Json }
      get_public_industry: { Args: { p_vertical: string }; Returns: Json }
      get_public_setting: { Args: { _key: string }; Returns: string }
      get_question_summary: { Args: { _question_id: string }; Returns: Json }
      get_quiz_leaderboard: {
        Args: { _limit?: number }
        Returns: {
          avatar_url: string
          avg_score: number
          full_name: string
          nickname: string
          quizzes_passed: number
          total_attempts: number
          user_id: string
        }[]
      }
      get_quiz_questions: {
        Args: { _lesson_id: string }
        Returns: {
          display_order: number
          id: string
          lesson_id: string
          options: Json
          question_text: string
          question_type: string
        }[]
      }
      get_reactivation_requests: {
        Args: never
        Returns: {
          created_at: string
          full_name: string
          id: string
          notes: string
          phone: string
          reset_row_id: string
          status: string
          user_id: string
          vertical: string
          worked_under: string
        }[]
      }
      get_recruiting_content: { Args: never; Returns: Json }
      get_recruiting_funnel: { Args: never; Returns: Json }
      get_recruiting_leaderboard: {
        Args: { _limit?: number }
        Returns: {
          active_claims: number
          avatar_url: string
          booked: number
          full_name: string
          nickname: string
          signed: number
          user_id: string
        }[]
      }
      get_recruiting_proof: { Args: never; Returns: Json }
      get_ref_code_leaderboard: {
        Args: never
        Returns: {
          leads: number
          ref_code: string
          signed: number
        }[]
      }
      get_referral_leads: {
        Args: never
        Returns: {
          city: string
          claimed_by: string
          claimed_name: string
          created_at: string
          first_name: string
          id: string
          interest_reason: string
          referrer_name: string
          status: string
        }[]
      }
      get_region_pace: { Args: never; Returns: Json }
      get_region_sheet: { Args: never; Returns: Json }
      get_rep_prep_facts: { Args: { _user_id: string }; Returns: Json }
      get_rep_scorecard: { Args: { _user_id: string }; Returns: Json }
      get_resign_board: { Args: never; Returns: Json }
      get_revenue_month: { Args: { _month: string }; Returns: Json }
      get_roster_gaps: { Args: never; Returns: Json }
      get_sales_reconciliation: {
        Args: { p_month: string }
        Returns: {
          full_name: string
          imported_revenue: number
          logged_revenue: number
          logged_sales: number
          reconciled: boolean
          user_id: string
        }[]
      }
      get_season_hub: { Args: never; Returns: Json }
      get_self_reported_week: {
        Args: { p_week_start?: string }
        Returns: {
          first_sale: string
          full_name: string
          rank: number
          revenue: number
          sales: number
          team_name: string
          user_id: string
        }[]
      }
      get_self_reported_week_teams: {
        Args: { p_week_start?: string }
        Returns: {
          first_sale: string
          rank: number
          revenue: number
          sales: number
          team_id: string
          team_name: string
        }[]
      }
      get_session_prep: { Args: { _since?: string }; Returns: Json }
      get_setting: {
        Args: { _default?: string; _key: string }
        Returns: string
      }
      get_source_breakdown: { Args: never; Returns: Json }
      get_streak_leaderboard: {
        Args: { _limit?: number }
        Returns: {
          avatar_url: string
          current_streak: number
          full_name: string
          longest_streak: number
          nickname: string
          total_days_active: number
          user_id: string
        }[]
      }
      get_sweep_queue: {
        Args: { _gap?: string; _leader?: string; _office_id?: string }
        Returns: Json
      }
      get_team_battles: {
        Args: never
        Returns: {
          member_count: number
          rank: number
          team_id: string
          team_name: string
          total_points: number
        }[]
      }
      get_team_lead_applications: { Args: { _status?: string }; Returns: Json }
      get_team_revenue: { Args: never; Returns: Json }
      get_the_stack: { Args: never; Returns: Json }
      get_thread_messages: { Args: { _thread_id: string }; Returns: Json }
      get_ticket_config: { Args: never; Returns: Json }
      get_ticket_series_status: { Args: never; Returns: Json }
      get_training_leaderboard_panel: {
        Args: { _limit?: number }
        Returns: {
          badges: string[]
          completed_count: number
          full_name: string
          global_percent: number
          nickname: string
          total_count: number
          user_id: string
        }[]
      }
      get_training_recap: { Args: { _user_id: string }; Returns: Json }
      get_under_led: {
        Args: { _max_weeks?: number; _min_revenue?: number }
        Returns: Json
      }
      get_unresolved_manager_links: {
        Args: never
        Returns: {
          email: string
          full_name: string
          legacy_manager: string
          legacy_recruiter: string
          user_id: string
        }[]
      }
      get_user_downline: {
        Args: { _manager_name: string }
        Returns: {
          depth: number
          direct_manager: string
          email: string
          full_name: string
          profile_id: string
          role: Database["public"]["Enums"]["app_role"]
          team_name: string
          user_id: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_vertical_applications: { Args: { _status?: string }; Returns: Json }
      get_vertical_enrollments: { Args: never; Returns: Json }
      get_vertical_requests: { Args: { _status?: string }; Returns: Json }
      get_week_pace: { Args: never; Returns: Json }
      get_winback_feed: { Args: never; Returns: Json }
      get_winter_plan_summary: { Args: never; Returns: Json }
      get_workspace_mentionables: {
        Args: never
        Returns: {
          full_name: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      ingest_fiber_week: { Args: { batch: Json }; Returns: Json }
      ingest_pest_revenue: { Args: { batch: Json }; Returns: Json }
      invite_preview: { Args: { p_token: string }; Returns: Json }
      is_chat_admin: { Args: { _uid: string }; Returns: boolean }
      is_chat_staff: { Args: { _uid: string }; Returns: boolean }
      is_course_complete: {
        Args: { _course: string; _user: string }
        Returns: boolean
      }
      is_dm_channel: { Args: { _slug: string }; Returns: boolean }
      is_dm_member: { Args: { _slug: string; _uid: string }; Returns: boolean }
      is_effective_manager: { Args: { _uid: string }; Returns: boolean }
      is_fiber_editor: { Args: { _uid: string }; Returns: boolean }
      is_first_week_eligible: { Args: { _target: string }; Returns: boolean }
      is_gated_recruit: { Args: { _uid: string }; Returns: boolean }
      is_in_my_downline: { Args: { _child: string }; Returns: boolean }
      is_leader_of: {
        Args: { _leader: string; _person: string }
        Returns: boolean
      }
      is_manager_tier: { Args: { _uid: string }; Returns: boolean }
      is_owner: { Args: { _uid: string }; Returns: boolean }
      is_paired_manager_of: {
        Args: { _manager: string; _rep: string }
        Returns: boolean
      }
      is_president_of: {
        Args: { _uid: string; _vertical: string }
        Returns: boolean
      }
      is_president_of_rep: {
        Args: { _rep: string; _uid: string }
        Returns: boolean
      }
      is_president_of_vertical: {
        Args: { _vertical: string }
        Returns: boolean
      }
      is_staff: { Args: { _uid: string }; Returns: boolean }
      is_staff_data_reader: { Args: never; Returns: boolean }
      is_vertical_lead: {
        Args: { _uid: string; _vertical: string }
        Returns: boolean
      }
      is_vertical_lead_of_rep: {
        Args: { _rep: string; _uid: string }
        Returns: boolean
      }
      lead_add_tag: {
        Args: { _lead: string; _tag: string }
        Returns: undefined
      }
      lead_assign_to_manager: {
        Args: { _lead_id: string; _to: string }
        Returns: Json
      }
      lead_assignment_queue: { Args: { _limit?: number }; Returns: Json }
      lead_claim: { Args: { _lead: string }; Returns: undefined }
      lead_decline_designation: { Args: { _lead_id: string }; Returns: Json }
      lead_designate: {
        Args: { _lead: string; _to: string }
        Returns: undefined
      }
      lead_detail: { Args: { _lead: string }; Returns: Json }
      lead_free: { Args: { _lead: string }; Returns: undefined }
      lead_log: {
        Args: {
          _body?: string
          _kind: string
          _lead: string
          _next_call_at?: string
          _outcome?: string
        }
        Returns: undefined
      }
      lead_manager_blocked: { Args: { _name: string }; Returns: boolean }
      lead_match_manager: {
        Args: { _former_manager_name: string }
        Returns: string
      }
      lead_name_key: { Args: { _name: string }; Returns: string }
      lead_norm_name: { Args: { _name: string }; Returns: string }
      lead_private_note_add: {
        Args: { _body: string; _kind: string; _lead: string }
        Returns: undefined
      }
      lead_set_cycling: {
        Args: { _cycle_days: number; _hold: boolean; _lead: string }
        Returns: undefined
      }
      lead_set_notes: {
        Args: { _lead: string; _notes: string }
        Returns: undefined
      }
      lead_set_stage: {
        Args: { _lead: string; _stage: string }
        Returns: undefined
      }
      lead_system_for: { Args: { _uid: string }; Returns: string }
      leads_callbacks_due: { Args: never; Returns: number }
      leads_counts: { Args: never; Returns: Json }
      leads_designate_bulk: {
        Args: { _leads: string[]; _to: string }
        Returns: number
      }
      leads_import_commit: { Args: { _decisions: Json }; Returns: Json }
      leads_import_preview: { Args: { _rows: Json }; Returns: Json }
      leads_list: {
        Args: {
          _designated_to?: string
          _designation?: string
          _has_phone?: boolean
          _limit?: number
          _rev_max?: number
          _rev_min?: number
          _roster_status?: string
          _scope?: string
          _search?: string
          _signed?: boolean
          _stage?: string
          _system?: string
          _tag?: string
        }
        Returns: {
          call_count: number
          committed_last_day: string
          cycle_days: number
          cycles_in_days: number
          days_in_market: number
          designated_at: string
          designated_has_access: boolean
          designated_to: string
          designated_to_name: string
          designation_status: string
          do_not_call: boolean
          email: string
          former_manager_name: string
          full_name: string
          hold: boolean
          id: string
          last_contact_at: string
          last_outcome: string
          next_call_at: string
          notes: string
          on_roster: boolean
          phone: string
          profile_id: string
          recruiter_name: string
          rep_year: string
          rev_per_day: number
          role_title: string
          roster_status: string
          season_revenue: number
          signed_2027: boolean
          stage: string
          start_date: string
          system: string
          tags: string[]
          team_name: string
        }[]
      }
      leads_manager_options: {
        Args: never
        Returns: {
          designated_count: number
          full_name: string
          has_access: boolean
          user_id: string
        }[]
      }
      log_application_first_touch: { Args: { _id: string }; Returns: Json }
      log_fiber_today: {
        Args: {
          p_carrier_id?: string
          p_day?: string
          p_note?: string
          p_sold: number
        }
        Returns: undefined
      }
      log_winback_contact: {
        Args: { _lead_id: string; _note?: string; _outcome: string }
        Returns: Json
      }
      make_blitz_official: {
        Args: {
          p_end: string
          p_host?: string
          p_location?: string
          p_market_id: string
          p_start: string
        }
        Returns: string
      }
      manager_owed: { Args: { _manager?: string }; Returns: Json }
      mark_announcements_seen: { Args: { _ids: string[] }; Returns: undefined }
      mark_chat_channel_read: {
        Args: { _all?: boolean; _channel: string }
        Returns: Json
      }
      mark_event_present: {
        Args: { p_event_id: string; p_present: boolean; p_user_id: string }
        Returns: undefined
      }
      mark_first_week_item: {
        Args: { _day: number; _key: string; _on?: boolean; _user: string }
        Returns: Json
      }
      mark_inactive_users: { Args: never; Returns: undefined }
      mark_mastery_check: {
        Args: { _module_id: string; _source?: string; _user_id?: string }
        Returns: undefined
      }
      mark_sales_reconciled: {
        Args: { p_month: string; p_user_id: string }
        Returns: number
      }
      mark_week_opened: { Args: never; Returns: undefined }
      match_leaderboard_rows: { Args: { _rows: Json }; Returns: Json }
      match_revenue_import: { Args: { _rows: Json }; Returns: Json }
      match_winback_gold: { Args: { _rows: Json }; Returns: Json }
      mentee_count: { Args: { _manager_id: string }; Returns: number }
      my_active_vertical: { Args: never; Returns: string }
      my_fiber_tier: { Args: { _uid: string }; Returns: Json }
      my_home_numbers: { Args: never; Returns: Json }
      my_next_year_pay: { Args: never; Returns: Json }
      my_notification_prefs: { Args: never; Returns: Json }
      my_presided_verticals: { Args: { _uid: string }; Returns: string[] }
      my_referral_count: { Args: never; Returns: number }
      my_signed_count: { Args: never; Returns: number }
      my_vertical: { Args: never; Returns: string }
      new_invite_token: { Args: never; Returns: string }
      norm_person_name: { Args: { _t: string }; Returns: string }
      notification_deliver_at: { Args: { _urgent: boolean }; Returns: string }
      notify_chat_mentions: {
        Args: { _message_id: string; _user_ids: string[] }
        Returns: number
      }
      notify_due_action_items: { Args: never; Returns: number }
      notify_event_reminders: { Args: never; Returns: number }
      notify_lead_expiry_warnings: { Args: never; Returns: number }
      nudge_mentee: {
        Args: { _user_id: string; _vertical: string }
        Returns: Json
      }
      open_lead_on_departure: {
        Args: { _reason?: string; _user_id: string }
        Returns: undefined
      }
      owed_by_manager: { Args: never; Returns: Json }
      owner_hard_delete_person: {
        Args: { _user_id: string }
        Returns: undefined
      }
      owner_week: { Args: never; Returns: Json }
      parse_rep_year_text: { Args: { _raw: string }; Returns: number }
      post_weekly_awards: { Args: never; Returns: Json }
      prep_roster: {
        Args: never
        Returns: {
          avatar_url: string
          full_name: string
          group_key: string
          group_label: string
          is_vet: boolean
          manager_name: string
          manager_team: string
          manager_user_id: string
          rep_year: string
          role: string
          team_name: string
          user_id: string
        }[]
      }
      recalc_vertical_enrollment: {
        Args: { _user: string; _vertical: string }
        Returns: undefined
      }
      recalculate_all_time_points: { Args: never; Returns: undefined }
      recompute_missing_ranks: { Args: never; Returns: Json }
      record_activity_ping: {
        Args: { _minutes?: number; _screen?: string }
        Returns: undefined
      }
      record_daily_login: {
        Args: { _timezone?: string; _user_id: string }
        Returns: Json
      }
      record_daily_time: { Args: { _category: string }; Returns: undefined }
      record_departure: {
        Args: {
          _departure_type?: string
          _last_day?: string
          _reason?: string
          _revenue?: number
          _user_id: string
        }
        Returns: undefined
      }
      recruit_gate_state: { Args: never; Returns: Json }
      redeem_invite: {
        Args: {
          p_email: string
          p_first_name: string
          p_last_name: string
          p_phone: string
          p_token: string
        }
        Returns: Json
      }
      referral_counts: { Args: never; Returns: Json }
      refresh_series_card: { Args: { _root: string }; Returns: undefined }
      region_lead_of: { Args: { _uid: string }; Returns: string }
      release_stale_leads: { Args: never; Returns: number }
      remove_channel_member: {
        Args: { _id: string; _slug: string }
        Returns: Json
      }
      rename_chat_channel: {
        Args: { _label: string; _slug: string }
        Returns: Json
      }
      reopen_winter_plan: { Args: { _user_id: string }; Returns: Json }
      request_pairing: {
        Args: { _manager_id: string; _vertical: string }
        Returns: Json
      }
      request_vertical_access: {
        Args: { _answers: Json; _vertical: string }
        Returns: Json
      }
      resolve_person_by_name: { Args: { _name: string }; Returns: string }
      resolve_sheet_manager: {
        Args: { _m: string; _section: string }
        Returns: string
      }
      resolve_source_code: { Args: { p_code: string }; Returns: Json }
      respond_pairing: {
        Args: { _accept: boolean; _reason?: string; _request_id: string }
        Returns: Json
      }
      restore_access: {
        Args: {
          _manager?: string
          _owner_override?: boolean
          _role?: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: Json
      }
      restore_streak: { Args: { _user_id: string }; Returns: Json }
      revert_blitz_official: { Args: { p_market_id: string }; Returns: boolean }
      review_team_lead_application: {
        Args: { _approve: boolean; _id: string; _note?: string }
        Returns: Json
      }
      revoke_seat_invite: { Args: { _invite_id: string }; Returns: undefined }
      role_chips: { Args: { _user_ids: string[] }; Returns: Json }
      roll_reps_to_fiber: {
        Args: { _carrier_id?: string; _rep_ids: string[]; _start_date: string }
        Returns: number
      }
      route_people_leads: { Args: never; Returns: Json }
      rsvp_event:
        | { Args: { p_event_id: string; p_status: string }; Returns: undefined }
        | {
            Args: { p_answers: Json; p_event_id: string; p_status: string }
            Returns: undefined
          }
      run_notification_digest: { Args: never; Returns: number }
      save_goal_interview: {
        Args: {
          _income_goal: number
          _last_day: string
          _rep: string
          _why: string
        }
        Returns: Json
      }
      search_people: { Args: { _q: string }; Returns: Json }
      seat_set_manager: {
        Args: { _new_manager: string; _user_id: string }
        Returns: undefined
      }
      seats_rows: { Args: never; Returns: Json }
      set_access_code: {
        Args: { code_description?: string; new_code: string }
        Returns: string
      }
      set_active_vertical: { Args: { _vertical: string }; Returns: Json }
      set_appearance: { Args: { _appearance: string }; Returns: undefined }
      set_channel_cover: {
        Args: { _path: string; _slug: string }
        Returns: Json
      }
      set_channel_mute: {
        Args: { _muted: boolean; _slug: string }
        Returns: Json
      }
      set_day_one_items: { Args: { _video_ids: string[] }; Returns: undefined }
      set_manager_seat: {
        Args: { _grant: boolean; _user_id: string }
        Returns: undefined
      }
      set_my_winter_plan: { Args: { _answer: string }; Returns: Json }
      set_next_year_status: {
        Args: { _notes?: string; _status: string; _user_id: string }
        Returns: Json
      }
      set_person_lifecycle: {
        Args: {
          _new_status: string
          _reason?: string
          _user_id: string
          _vertical: string
        }
        Returns: undefined
      }
      set_roster_state: {
        Args: { _state: string; _user_id: string }
        Returns: undefined
      }
      set_vertical_theme: {
        Args: { _theme: Json; _vertical: string }
        Returns: undefined
      }
      set_winback_priority: {
        Args: { _lead_id: string; _priority: boolean }
        Returns: Json
      }
      setting_text: {
        Args: { _default: string; _key: string }
        Returns: string
      }
      start_dm: { Args: { _other: string }; Returns: Json }
      start_sweep_session: { Args: { _filter?: Json }; Returns: Json }
      submission_client_key: { Args: never; Returns: string }
      submit_commitment_interview: {
        Args: {
          _better_next_year: string
          _committed_last_day: string
          _next_year_intent: string
          _rep_id: string
          _terms_acknowledged: boolean
          _terms_text: string
          _why_here: string
        }
        Returns: Json
      }
      submit_reactivation_request: {
        Args: {
          _full_name: string
          _notes?: string
          _phone: string
          _vertical: string
          _worked_under: string
        }
        Returns: Json
      }
      submit_referral: {
        Args: { _name: string; _note?: string; _phone: string }
        Returns: Json
      }
      sweep_mark_gone: {
        Args: {
          _departure_type?: string
          _last_sale_date?: string
          _reason?: string
          _session_id?: string
          _user_id: string
        }
        Returns: Json
      }
      sweep_mark_here: {
        Args: {
          _committed_last_day?: string
          _next_year_status?: string
          _office_id?: string
          _session_id?: string
          _showed_up_date?: string
          _user_id: string
        }
        Returns: Json
      }
      sweep_pairing_requests: { Args: never; Returns: Json }
      sweep_restore: { Args: { _prev: Json }; Returns: Json }
      sweep_speed_to_lead: { Args: never; Returns: Json }
      sync_milestone_badges: { Args: { _user_id: string }; Returns: undefined }
      sync_staff_workspace_access: {
        Args: { _user_id?: string }
        Returns: undefined
      }
      team_channel_slug: { Args: { _name: string }; Returns: string }
      touch_last_login: { Args: never; Returns: undefined }
      undo_import_batch: { Args: { _batch_id: string }; Returns: Json }
      update_my_lead: {
        Args: { _lead_id: string; _notes: string; _status: string }
        Returns: Json
      }
      update_user_activity: { Args: { _user_id: string }; Returns: undefined }
      upsert_rep_revenue: {
        Args: {
          _month: string
          _pending?: number
          _revenue: number
          _serviced?: number
          _user_id: string
        }
        Returns: Json
      }
      user_tier: { Args: { _uid: string }; Returns: string }
      valid_public_email: { Args: { _email: string }; Returns: boolean }
      valid_public_phone: { Args: { _phone: string }; Returns: boolean }
      validate_access_code: { Args: { input_code: string }; Returns: boolean }
      validate_and_record_quiz: {
        Args: { _answers: Json; _lesson_id: string }
        Returns: Json
      }
      vertical_approver_state: { Args: { _vertical: string }; Returns: Json }
      vertical_effective_approvers: {
        Args: { _vertical: string }
        Returns: string[]
      }
      visible_chat_channels: {
        Args: { _user_id: string }
        Returns: {
          color: string
          display_order: number
          icon: string
          label: string
          slug: string
        }[]
      }
      withdraw_vertical_request: { Args: { _vertical: string }; Returns: Json }
      write_audit: {
        Args: {
          _action: string
          _after: string
          _before: string
          _entity_id: string
          _entity_label: string
          _entity_type: string
          _field: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "rookie"
        | "manager"
        | "admin"
        | "owner"
        | "recruiter"
        | "president"
      experience_level: "rookie" | "veteran"
      phone_visibility: "everyone" | "team" | "staff"
      priority_task_type:
        | "pitch_work"
        | "weekly_mission"
        | "manager_mission"
        | "recruit_goal"
      source_form_type: "rookie_1_on_1" | "manager_1_on_1"
      todo_priority: "urgent" | "high" | "medium" | "low"
      user_status:
        | "active"
        | "contract_signed"
        | "onboarded"
        | "info_added"
        | "nlc"
        | "pending"
        | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "rookie",
        "manager",
        "admin",
        "owner",
        "recruiter",
        "president",
      ],
      experience_level: ["rookie", "veteran"],
      phone_visibility: ["everyone", "team", "staff"],
      priority_task_type: [
        "pitch_work",
        "weekly_mission",
        "manager_mission",
        "recruit_goal",
      ],
      source_form_type: ["rookie_1_on_1", "manager_1_on_1"],
      todo_priority: ["urgent", "high", "medium", "low"],
      user_status: [
        "active",
        "contract_signed",
        "onboarded",
        "info_added",
        "nlc",
        "pending",
        "rejected",
      ],
    },
  },
} as const
