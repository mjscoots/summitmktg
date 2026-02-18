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
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_ai: boolean
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_ai?: boolean
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_ai?: boolean
          user_id?: string
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
      profiles: {
        Row: {
          approved: boolean | null
          avatar_url: string | null
          created_at: string | null
          direct_manager: string | null
          email: string
          experience: Database["public"]["Enums"]["experience_level"] | null
          full_name: string
          id: string
          is_active_now: boolean | null
          last_active_at: string | null
          organization: string | null
          otp_verified: boolean | null
          password_changed: boolean | null
          phone: string | null
          pillar_slug: string | null
          recruiter: string | null
          referred_by: string | null
          region: string | null
          status: Database["public"]["Enums"]["user_status"] | null
          team_id: string | null
          time_this_week_minutes: number | null
          timezone: string | null
          updated_at: string | null
          user_id: string
          week_start: string | null
        }
        Insert: {
          approved?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          direct_manager?: string | null
          email: string
          experience?: Database["public"]["Enums"]["experience_level"] | null
          full_name: string
          id?: string
          is_active_now?: boolean | null
          last_active_at?: string | null
          organization?: string | null
          otp_verified?: boolean | null
          password_changed?: boolean | null
          phone?: string | null
          pillar_slug?: string | null
          recruiter?: string | null
          referred_by?: string | null
          region?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          team_id?: string | null
          time_this_week_minutes?: number | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
          week_start?: string | null
        }
        Update: {
          approved?: boolean | null
          avatar_url?: string | null
          created_at?: string | null
          direct_manager?: string | null
          email?: string
          experience?: Database["public"]["Enums"]["experience_level"] | null
          full_name?: string
          id?: string
          is_active_now?: boolean | null
          last_active_at?: string | null
          organization?: string | null
          otp_verified?: boolean | null
          password_changed?: boolean | null
          phone?: string | null
          pillar_slug?: string | null
          recruiter?: string | null
          referred_by?: string | null
          region?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          team_id?: string | null
          time_this_week_minutes?: number | null
          timezone?: string | null
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
      award_training_points: {
        Args: { _points: number; _user_id: string }
        Returns: undefined
      }
      check_rate_limit: {
        Args: {
          p_key: string
          p_max_attempts: number
          p_window_seconds: number
        }
        Returns: boolean
      }
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
      app_role: "rookie" | "manager" | "admin"
      experience_level: "rookie" | "veteran"
      priority_task_type:
        | "pitch_work"
        | "weekly_mission"
        | "manager_mission"
        | "recruit_goal"
      source_form_type: "rookie_1_on_1" | "manager_1_on_1"
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
      app_role: ["rookie", "manager", "admin"],
      experience_level: ["rookie", "veteran"],
      priority_task_type: [
        "pitch_work",
        "weekly_mission",
        "manager_mission",
        "recruit_goal",
      ],
      source_form_type: ["rookie_1_on_1", "manager_1_on_1"],
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
