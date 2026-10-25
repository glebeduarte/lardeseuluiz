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
      announcements: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      assessment_answers: {
        Row: {
          answer_given: string | null
          attempt_id: string
          id: string
          is_correct: boolean | null
          points_earned: number | null
          question_id: string
        }
        Insert: {
          answer_given?: string | null
          attempt_id: string
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id: string
        }
        Update: {
          answer_given?: string | null
          attempt_id?: string
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "assessment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "assessment_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_attempts: {
        Row: {
          assessment_id: string
          attempt_number: number
          id: string
          passed: boolean | null
          score: number | null
          started_at: string
          submitted_at: string | null
          time_spent_seconds: number | null
          user_id: string
        }
        Insert: {
          assessment_id: string
          attempt_number?: number
          id?: string
          passed?: boolean | null
          score?: number | null
          started_at?: string
          submitted_at?: string | null
          time_spent_seconds?: number | null
          user_id: string
        }
        Update: {
          assessment_id?: string
          attempt_number?: number
          id?: string
          passed?: boolean | null
          score?: number | null
          started_at?: string
          submitted_at?: string | null
          time_spent_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_attempts_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_content_sources: {
        Row: {
          assessment_id: string
          content_text: string | null
          file_path: string | null
          id: string
          lesson_id: string | null
          source_type: string
        }
        Insert: {
          assessment_id: string
          content_text?: string | null
          file_path?: string | null
          id?: string
          lesson_id?: string | null
          source_type: string
        }
        Update: {
          assessment_id?: string
          content_text?: string | null
          file_path?: string | null
          id?: string
          lesson_id?: string | null
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_content_sources_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_content_sources_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_questions: {
        Row: {
          ai_generated: boolean
          alternatives: Json | null
          assessment_id: string
          correct_answer: string | null
          created_at: string
          explanation: string | null
          id: string
          needs_review: boolean
          order_index: number
          question_type: Database["public"]["Enums"]["question_type"]
          statement: string
        }
        Insert: {
          ai_generated?: boolean
          alternatives?: Json | null
          assessment_id: string
          correct_answer?: string | null
          created_at?: string
          explanation?: string | null
          id?: string
          needs_review?: boolean
          order_index?: number
          question_type?: Database["public"]["Enums"]["question_type"]
          statement: string
        }
        Update: {
          ai_generated?: boolean
          alternatives?: Json | null
          assessment_id?: string
          correct_answer?: string | null
          created_at?: string
          explanation?: string | null
          id?: string
          needs_review?: boolean
          order_index?: number
          question_type?: Database["public"]["Enums"]["question_type"]
          statement?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          course_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          max_attempts: number | null
          passing_score: number
          position_lesson_after_id: string | null
          position_module_id: string | null
          position_type: Database["public"]["Enums"]["assessment_position_type"]
          requires_completion: boolean
          show_answers_after: Database["public"]["Enums"]["assessment_show_answers"]
          shuffle_alternatives: boolean
          shuffle_questions: boolean
          status: Database["public"]["Enums"]["assessment_status"]
          time_limit_minutes: number | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          max_attempts?: number | null
          passing_score?: number
          position_lesson_after_id?: string | null
          position_module_id?: string | null
          position_type?: Database["public"]["Enums"]["assessment_position_type"]
          requires_completion?: boolean
          show_answers_after?: Database["public"]["Enums"]["assessment_show_answers"]
          shuffle_alternatives?: boolean
          shuffle_questions?: boolean
          status?: Database["public"]["Enums"]["assessment_status"]
          time_limit_minutes?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          max_attempts?: number | null
          passing_score?: number
          position_lesson_after_id?: string | null
          position_module_id?: string | null
          position_type?: Database["public"]["Enums"]["assessment_position_type"]
          requires_completion?: boolean
          show_answers_after?: Database["public"]["Enums"]["assessment_show_answers"]
          shuffle_alternatives?: boolean
          shuffle_questions?: boolean
          status?: Database["public"]["Enums"]["assessment_status"]
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_position_lesson_after_id_fkey"
            columns: ["position_lesson_after_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_position_module_id_fkey"
            columns: ["position_module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          created_at: string
          id: string
          lesson_id: string
          name: string
          type: string | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id: string
          name: string
          type?: string | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string
          name?: string
          type?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_links: {
        Row: {
          created_at: string | null
          created_by: string
          expires_at: string
          id: string
          lesson_id: string
          redirect_url: string | null
          token: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          expires_at: string
          id?: string
          lesson_id: string
          redirect_url?: string | null
          token?: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          expires_at?: string
          id?: string
          lesson_id?: string
          redirect_url?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_links_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          confirmed_at: string | null
          id: string
          ip_address: string | null
          lesson_id: string
          link_id: string
          user_id: string
        }
        Insert: {
          confirmed_at?: string | null
          id?: string
          ip_address?: string | null
          lesson_id: string
          link_id: string
          user_id: string
        }
        Update: {
          confirmed_at?: string | null
          id?: string
          ip_address?: string | null
          lesson_id?: string
          link_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "attendance_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          author: string
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          pdf_url: string | null
          spirit: string | null
          study_lines: string[] | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          pdf_url?: string | null
          spirit?: string | null
          study_lines?: string[] | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          pdf_url?: string | null
          spirit?: string | null
          study_lines?: string[] | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      class_groups: {
        Row: {
          course_id: string
          created_at: string
          id: string
          max_students: number | null
          name: string
          updated_at: string
          vacancy_type: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          max_students?: number | null
          name?: string
          updated_at?: string
          vacancy_type?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          max_students?: number | null
          name?: string
          updated_at?: string
          vacancy_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_groups_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          audience: string
          category: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          end_date: string | null
          enrollment_open: boolean
          estimated_duration_minutes: number | null
          tagline: string | null
          featured: boolean
          featured_order: number
          trailer_url: string | null
          facilitator: string | null
          id: string
          learning_topics: string[] | null
          long_description: string | null
          registration_page_enabled: boolean
          schedule: string | null
          start_date: string | null
          status: string
          study_lines: string[]
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          category?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          enrollment_open?: boolean
          estimated_duration_minutes?: number | null
          tagline?: string | null
          featured?: boolean
          featured_order?: number
          trailer_url?: string | null
          facilitator?: string | null
          id?: string
          learning_topics?: string[] | null
          long_description?: string | null
          registration_page_enabled?: boolean
          schedule?: string | null
          start_date?: string | null
          status?: string
          study_lines?: string[]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          category?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          enrollment_open?: boolean
          estimated_duration_minutes?: number | null
          tagline?: string | null
          featured?: boolean
          featured_order?: number
          trailer_url?: string | null
          facilitator?: string | null
          id?: string
          learning_topics?: string[] | null
          long_description?: string | null
          registration_page_enabled?: boolean
          schedule?: string | null
          start_date?: string | null
          status?: string
          study_lines?: string[]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      dashboard_config: {
        Row: {
          announcement_enabled: boolean | null
          announcement_text: string | null
          announcement_type: string | null
          custom_css: string | null
          hero_image_url: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          sections_order: string[] | null
          show_filters: boolean | null
          show_hero: boolean | null
          show_search: boolean | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          announcement_enabled?: boolean | null
          announcement_text?: string | null
          announcement_type?: string | null
          custom_css?: string | null
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          sections_order?: string[] | null
          show_filters?: boolean | null
          show_hero?: boolean | null
          show_search?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          announcement_enabled?: boolean | null
          announcement_text?: string | null
          announcement_type?: string | null
          custom_css?: string | null
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          sections_order?: string[] | null
          show_filters?: boolean | null
          show_hero?: boolean | null
          show_search?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          created_at: string
          failed_count: number
          html_content: string
          id: string
          recipient_emails: string[]
          recipient_names: string[]
          recipients_count: number
          sent_by: string | null
          sent_count: number
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          failed_count?: number
          html_content: string
          id?: string
          recipient_emails?: string[]
          recipient_names?: string[]
          recipients_count?: number
          sent_by?: string | null
          sent_count?: number
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          failed_count?: number
          html_content?: string
          id?: string
          recipient_emails?: string[]
          recipient_names?: string[]
          recipients_count?: number
          sent_by?: string | null
          sent_count?: number
          status?: string
          subject?: string
        }
        Relationships: []
      }
      email_daily_usage: {
        Row: {
          created_at: string
          daily_limit: number
          id: string
          sent_count: number
          updated_at: string
          usage_date: string
        }
        Insert: {
          created_at?: string
          daily_limit?: number
          id?: string
          sent_count?: number
          updated_at?: string
          usage_date?: string
        }
        Update: {
          created_at?: string
          daily_limit?: number
          id?: string
          sent_count?: number
          updated_at?: string
          usage_date?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string
          email_to: string
          email_type: string
          error_message: string | null
          id: string
          metadata: Json | null
          resend_id: string | null
          sent_at: string | null
          status: string
          subject: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email_to: string
          email_type: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email_to?: string
          email_type?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue: {
        Row: {
          campaign_id: string | null
          created_at: string
          email_type: string
          error_message: string | null
          html_content: string
          id: string
          metadata: Json | null
          recipient_email: string
          recipient_name: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          email_type?: string
          error_message?: string | null
          html_content: string
          id?: string
          metadata?: Json | null
          recipient_email: string
          recipient_name?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          email_type?: string
          error_message?: string | null
          html_content?: string
          id?: string
          metadata?: Json | null
          recipient_email?: string
          recipient_name?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          created_at: string
          description: string | null
          html_content: string
          id: string
          is_active: boolean
          name: string
          subject: string
          template_key: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          html_content: string
          id?: string
          is_active?: boolean
          name: string
          subject: string
          template_key: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          created_at?: string
          description?: string | null
          html_content?: string
          id?: string
          is_active?: boolean
          name?: string
          subject?: string
          template_key?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          class_group_id: string
          course_id: string
          created_at: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          class_group_id: string
          course_id: string
          created_at?: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          class_group_id?: string
          course_id?: string
          created_at?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_class_group_id_fkey"
            columns: ["class_group_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      esde_calendar_entries: {
        Row: {
          course_code: string
          created_at: string
          date_label: string
          facilitador: string
          id: string
          modulo: string
          roteiro: string
          sort_order: number
          tema: string
          tipo: string
          updated_at: string
        }
        Insert: {
          course_code?: string
          created_at?: string
          date_label: string
          facilitador?: string
          id?: string
          modulo?: string
          roteiro?: string
          sort_order?: number
          tema?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          course_code?: string
          created_at?: string
          date_label?: string
          facilitador?: string
          id?: string
          modulo?: string
          roteiro?: string
          sort_order?: number
          tema?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          created_at: string
          description: string | null
          embed_title: string | null
          embed_url: string | null
          id: string
          module_id: string
          order_index: number
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          embed_title?: string | null
          embed_url?: string | null
          id?: string
          module_id: string
          order_index?: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          embed_title?: string | null
          embed_url?: string | null
          id?: string
          module_id?: string
          order_index?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          description: string
          id: string
          is_read: boolean
          related_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_read?: boolean
          related_id?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_read?: boolean
          related_id?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          inactivity_reminder_sent_at: string | null
          is_active: boolean
          last_activity_at: string | null
          must_change_password: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          inactivity_reminder_sent_at?: string | null
          is_active?: boolean
          last_activity_at?: string | null
          must_change_password?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          inactivity_reminder_sent_at?: string | null
          is_active?: boolean
          last_activity_at?: string | null
          must_change_password?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Relationships: []
      }
      registration_pages: {
        Row: {
          course_ids: string[]
          cover_url: string | null
          created_at: string
          created_by: string | null
          free_text: string | null
          id: string
          info_day: string | null
          info_extra: string | null
          info_format: string | null
          info_time: string | null
          is_active: boolean
          show_course_covers: boolean
          slug: string
          subtitle: string | null
          thanks_text: string | null
          title: string
          updated_at: string
          whatsapp_group_url: string | null
        }
        Insert: {
          course_ids?: string[]
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          free_text?: string | null
          id?: string
          info_day?: string | null
          info_extra?: string | null
          info_format?: string | null
          info_time?: string | null
          is_active?: boolean
          show_course_covers?: boolean
          slug: string
          subtitle?: string | null
          thanks_text?: string | null
          title: string
          updated_at?: string
          whatsapp_group_url?: string | null
        }
        Update: {
          course_ids?: string[]
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          free_text?: string | null
          id?: string
          info_day?: string | null
          info_extra?: string | null
          info_format?: string | null
          info_time?: string | null
          is_active?: boolean
          show_course_covers?: boolean
          slug?: string
          subtitle?: string | null
          thanks_text?: string | null
          title?: string
          updated_at?: string
          whatsapp_group_url?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_daily_email_remaining: { Args: never; Returns: number }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_daily_email_usage: { Args: { count?: number }; Returns: number }
      is_admin: { Args: { user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "student"
      assessment_position_type:
        | "after_module"
        | "before_module"
        | "end_of_course"
        | "between_lessons"
      assessment_show_answers: "always" | "never" | "on_pass"
      assessment_status: "draft" | "published" | "archived"
      question_type:
        | "multiple_choice"
        | "true_false"
        | "multiple_answer"
        | "ordering"
        | "fill_blank"
        | "essay"
      user_role: "admin" | "student"
      user_type: "frequentador" | "trabalhador"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "student"],
      assessment_position_type: [
        "after_module",
        "before_module",
        "end_of_course",
        "between_lessons",
      ],
      assessment_show_answers: ["always", "never", "on_pass"],
      assessment_status: ["draft", "published", "archived"],
      question_type: [
        "multiple_choice",
        "true_false",
        "multiple_answer",
        "ordering",
        "fill_blank",
        "essay",
      ],
      user_role: ["admin", "student"],
      user_type: ["frequentador", "trabalhador"],
    },
  },
} as const
