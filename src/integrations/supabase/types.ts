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
    PostgrestVersion: "14.1"
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
          full_name: string
          id: string
          notes: string | null
          phone: string
          previous_company: string | null
          referral_source: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          years_experience: number | null
        }
        Insert: {
          application_type: string
          city_state: string
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          notes?: string | null
          phone: string
          previous_company?: string | null
          referral_source: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          years_experience?: number | null
        }
        Update: {
          application_type?: string
          city_state?: string
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string
          previous_company?: string | null
          referral_source?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          years_experience?: number | null
        }
        Relationships: []
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
          created_at: string | null
          event_id: string
          id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          status: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
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
          event_type: string | null
          id: string
          is_team_wide: boolean | null
          location: string | null
          manager_id: string | null
          parent_event_id: string | null
          recurrence_count: number | null
          recurrence_day_of_month: number | null
          recurrence_days_of_week: number[] | null
          recurrence_end_date: string | null
          recurrence_interval: number | null
          recurrence_type: string | null
          target_role: Database["public"]["Enums"]["app_role"] | null
          team_id: string | null
          timezone: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_date: string
          event_type?: string | null
          id?: string
          is_team_wide?: boolean | null
          location?: string | null
          manager_id?: string | null
          parent_event_id?: string | null
          recurrence_count?: number | null
          recurrence_day_of_month?: number | null
          recurrence_days_of_week?: number[] | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_type?: string | null
          target_role?: Database["public"]["Enums"]["app_role"] | null
          team_id?: string | null
          timezone?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_date?: string
          event_type?: string | null
          id?: string
          is_team_wide?: boolean | null
          location?: string | null
          manager_id?: string | null
          parent_event_id?: string | null
          recurrence_count?: number | null
          recurrence_day_of_month?: number | null
          recurrence_days_of_week?: number[] | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_type?: string | null
          target_role?: Database["public"]["Enums"]["app_role"] | null
          team_id?: string | null
          timezone?: string | null
          title?: string
          updated_at?: string | null
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
      chat_channels: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          display_order: number
          icon: string
          id: string
          is_active: boolean
          label: string
          slug: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          label: string
          slug: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          icon?: string
          id?: string
          is_active?: boolean
          label?: string
          slug?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          channel: string
          content: string
          created_at: string
          id: string
          is_ai: boolean
          is_pinned: boolean
          reply_to: string | null
          user_id: string
        }
        Insert: {
          channel?: string
          content: string
          created_at?: string
          id?: string
          is_ai?: boolean
          is_pinned?: boolean
          reply_to?: string | null
          user_id: string
        }
        Update: {
          channel?: string
          content?: string
          created_at?: string
          id?: string
          is_ai?: boolean
          is_pinned?: boolean
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
          streak_points_awarded: number
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
          streak_points_awarded?: number
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
          streak_points_awarded?: number
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
      notification_preferences: {
        Row: {
          bootcamp_reminders: boolean
          calendar_events: boolean
          chat_mentions: boolean
          created_at: string
          id: string
          leaderboard: boolean
          streak_milestones: boolean
          training_quiz: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          bootcamp_reminders?: boolean
          calendar_events?: boolean
          chat_mentions?: boolean
          created_at?: string
          id?: string
          leaderboard?: boolean
          streak_milestones?: boolean
          training_quiz?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          bootcamp_reminders?: boolean
          calendar_events?: boolean
          chat_mentions?: boolean
          created_at?: string
          id?: string
          leaderboard?: boolean
          streak_milestones?: boolean
          training_quiz?: boolean
          updated_at?: string
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
      pitch_approval_requests: {
        Row: {
          attempt_number: number | null
          created_at: string | null
          id: string
          lesson_id: string
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
          lesson_id: string
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
          lesson_id?: string
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
          approved: boolean | null
          avatar_url: string | null
          created_at: string | null
          cumulative_points: number | null
          direct_manager: string | null
          email: string
          experience: Database["public"]["Enums"]["experience_level"] | null
          full_name: string
          id: string
          is_active_now: boolean | null
          last_active_at: string | null
          legacy_points_snapshot: number | null
          nickname: string | null
          onboarding_status: string | null
          organization: string | null
          otp_verified: boolean | null
          password_changed: boolean | null
          phone: string | null
          pillar_slug: string | null
          recruiter: string | null
          referred_by: string | null
          region: string | null
          revenue_goal: number | null
          status: Database["public"]["Enums"]["user_status"] | null
          team_id: string | null
          time_this_week_minutes: number | null
          timezone: string | null
          tour_completed: boolean | null
          updated_at: string | null
          user_id: string
          week_start: string | null
        }
        Insert: {
          approved?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          cumulative_points?: number | null
          direct_manager?: string | null
          email: string
          experience?: Database["public"]["Enums"]["experience_level"] | null
          full_name: string
          id?: string
          is_active_now?: boolean | null
          last_active_at?: string | null
          legacy_points_snapshot?: number | null
          nickname?: string | null
          onboarding_status?: string | null
          organization?: string | null
          otp_verified?: boolean | null
          password_changed?: boolean | null
          phone?: string | null
          pillar_slug?: string | null
          recruiter?: string | null
          referred_by?: string | null
          region?: string | null
          revenue_goal?: number | null
          status?: Database["public"]["Enums"]["user_status"] | null
          team_id?: string | null
          time_this_week_minutes?: number | null
          timezone?: string | null
          tour_completed?: boolean | null
          updated_at?: string | null
          user_id: string
          week_start?: string | null
        }
        Update: {
          approved?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          cumulative_points?: number | null
          direct_manager?: string | null
          email?: string
          experience?: Database["public"]["Enums"]["experience_level"] | null
          full_name?: string
          id?: string
          is_active_now?: boolean | null
          last_active_at?: string | null
          legacy_points_snapshot?: number | null
          nickname?: string | null
          onboarding_status?: string | null
          organization?: string | null
          otp_verified?: boolean | null
          password_changed?: boolean | null
          phone?: string | null
          pillar_slug?: string | null
          recruiter?: string | null
          referred_by?: string | null
          region?: string | null
          revenue_goal?: number | null
          status?: Database["public"]["Enums"]["user_status"] | null
          team_id?: string | null
          time_this_week_minutes?: number | null
          timezone?: string | null
          tour_completed?: boolean | null
          updated_at?: string | null
          user_id?: string
          week_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
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
        }
        Insert: {
          created_at?: string
          id?: string
          last_edited_at?: string | null
          last_edited_by?: string | null
          module: string
          script_content?: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_edited_at?: string | null
          last_edited_by?: string | null
          module?: string
          script_content?: string
          team_id?: string
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
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          leader_id?: string | null
          logo_url?: string | null
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          leader_id?: string | null
          logo_url?: string | null
          name?: string
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
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          slug: string
          target_role: Database["public"]["Enums"]["app_role"] | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          slug: string
          target_role?: Database["public"]["Enums"]["app_role"] | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          slug?: string
          target_role?: Database["public"]["Enums"]["app_role"] | null
          title?: string
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
          video_url?: string | null
          visible_to_teams?: string[] | null
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          title?: string
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
          id: string
          user_id: string
          video_id: string
          watched: boolean | null
          watched_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
          video_id: string
          watched?: boolean | null
          watched_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
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
      weekly_one_on_ones_manager: {
        Row: {
          completed_mission: string
          created_at: string
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
          completed_mission: string
          created_at?: string
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
          completed_mission?: string
          created_at?: string
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
          completed_challenge: string
          created_at: string
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
          completed_challenge: string
          created_at?: string
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
          completed_challenge?: string
          created_at?: string
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
      check_rate_limit: {
        Args: {
          p_key: string
          p_max_attempts: number
          p_window_seconds: number
        }
        Returns: boolean
      }
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
      get_daily_challenge: { Args: { _user_id: string }; Returns: Json }
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
      get_my_points_breakdown: { Args: { _user_id: string }; Returns: Json }
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_inactive_users: { Args: never; Returns: undefined }
      recalculate_all_time_points: { Args: never; Returns: undefined }
      record_daily_login: {
        Args: { _timezone?: string; _user_id: string }
        Returns: Json
      }
      record_daily_time: {
        Args: { _category: string; _user_id: string }
        Returns: undefined
      }
      set_access_code: {
        Args: { code_description?: string; new_code: string }
        Returns: string
      }
      update_user_activity: { Args: { _user_id: string }; Returns: undefined }
      validate_access_code: { Args: { input_code: string }; Returns: boolean }
      validate_and_record_quiz: {
        Args: { _answers: Json; _lesson_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "rookie" | "manager" | "admin" | "owner"
      experience_level: "rookie" | "veteran"
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
      app_role: ["rookie", "manager", "admin", "owner"],
      experience_level: ["rookie", "veteran"],
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
