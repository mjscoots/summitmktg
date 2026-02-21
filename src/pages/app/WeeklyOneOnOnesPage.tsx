import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, User, UserCheck, Filter } from 'lucide-react';
import {
  Team,
  RookieManagerForm,
  ManagerForm,
  ResponsesTab,
} from '@/components/one-on-one/shared';

export default function WeeklyOneOnOnesPage() {
  const { profile, user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTab, setActiveTab] = useState('rookie-form');

  useEffect(() => {
    const fetchTeams = async () => {
      const { data } = await supabase.from('teams').select('id, name').order('name');
      setTeams(data || []);
    };
    fetchTeams();
  }, []);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Weekly 1:1's</h1>
          </div>
          <p className="text-muted-foreground">
            Complete your weekly check-in forms to maintain consistent communication with your team.
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-12">
            <TabsTrigger value="rookie-form" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Rookie-Manager 1:1</span>
              <span className="sm:hidden">Rookie</span>
            </TabsTrigger>
            <TabsTrigger value="manager-form" className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Manager 1:1</span>
              <span className="sm:hidden">Manager</span>
            </TabsTrigger>
            <TabsTrigger value="responses" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Responses
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rookie-form">
            <RookieManagerForm
              teams={teams}
              profile={profile}
              userId={user?.id}
            />
          </TabsContent>

          <TabsContent value="manager-form">
            <ManagerForm
              teams={teams}
              profile={profile}
              userId={user?.id}
            />
          </TabsContent>

          <TabsContent value="responses">
            <ResponsesTab teams={teams} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
