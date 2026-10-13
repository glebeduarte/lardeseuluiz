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
      agenda_items: {
        Row: {
          assembly_id: string
          created_at: string
          description: string | null
          id: string
          item_order: number
          requires_vote: boolean
          title: string
        }
        Insert: {
          assembly_id: string
          created_at?: string
          description?: string | null
          id?: string
          item_order?: number
          requires_vote?: boolean
          title: string
        }
        Update: {
          assembly_id?: string
          created_at?: string
          description?: string | null
          id?: string
          item_order?: number
          requires_vote?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_items_assembly_id_fkey"
            columns: ["assembly_id"]
            isOneToOne: false
            referencedRelation: "assemblies"
            referencedColumns: ["id"]
          },
        ]
      }
      assemblies: {
        Row: {
          assembly_type: Database["public"]["Enums"]["assembly_type"]
          convocation_text: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          location: string | null
          minutes_text: string | null
          quorum_required: number
          scheduled_date: string
          status: Database["public"]["Enums"]["assembly_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assembly_type?: Database["public"]["Enums"]["assembly_type"]
          convocation_text?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          minutes_text?: string | null
          quorum_required?: number
          scheduled_date: string
          status?: Database["public"]["Enums"]["assembly_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assembly_type?: Database["public"]["Enums"]["assembly_type"]
          convocation_text?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          location?: string | null
          minutes_text?: string | null
          quorum_required?: number
          scheduled_date?: string
          status?: Database["public"]["Enums"]["assembly_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      assembly_attendees: {
        Row: {
          assembly_id: string
          associate_id: string | null
          checked_in_at: string | null
          id: string
          person_id: string | null
        }
        Insert: {
          assembly_id: string
          associate_id?: string | null
          checked_in_at?: string | null
          id?: string
          person_id?: string | null
        }
        Update: {
          assembly_id?: string
          associate_id?: string | null
          checked_in_at?: string | null
          id?: string
          person_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assembly_attendees_assembly_id_fkey"
            columns: ["assembly_id"]
            isOneToOne: false
            referencedRelation: "assemblies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_attendees_associate_id_fkey"
            columns: ["associate_id"]
            isOneToOne: false
            referencedRelation: "associates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_attendees_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      associate_memberships: {
        Row: {
          admission_date: string
          category: Database["public"]["Enums"]["membership_category"]
          created_at: string
          exit_date: string | null
          id: string
          notes: string | null
          person_id: string
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
        }
        Insert: {
          admission_date?: string
          category: Database["public"]["Enums"]["membership_category"]
          created_at?: string
          exit_date?: string | null
          id?: string
          notes?: string | null
          person_id: string
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
        }
        Update: {
          admission_date?: string
          category?: Database["public"]["Enums"]["membership_category"]
          created_at?: string
          exit_date?: string | null
          id?: string
          notes?: string | null
          person_id?: string
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "associate_memberships_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      associates: {
        Row: {
          birth_date: string | null
          category: Database["public"]["Enums"]["associate_category"]
          cpf: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          join_date: string
          notes: string | null
          phone: string | null
          status: Database["public"]["Enums"]["associate_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          birth_date?: string | null
          category?: Database["public"]["Enums"]["associate_category"]
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          join_date?: string
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["associate_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          birth_date?: string | null
          category?: Database["public"]["Enums"]["associate_category"]
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          join_date?: string
          notes?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["associate_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      contributions: {
        Row: {
          amount: number
          associate_id: string | null
          created_at: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          person_id: string | null
          reference_month: string
        }
        Insert: {
          amount: number
          associate_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          person_id?: string | null
          reference_month: string
        }
        Update: {
          amount?: number
          associate_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          person_id?: string | null
          reference_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "contributions_associate_id_fkey"
            columns: ["associate_id"]
            isOneToOne: false
            referencedRelation: "associates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      data_requests: {
        Row: {
          associate_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          person_id: string | null
          request_status: Database["public"]["Enums"]["dsar_status"]
          request_type: Database["public"]["Enums"]["dsar_type"]
          requested_at: string
          responded_at: string | null
          response_text: string | null
          updated_at: string
        }
        Insert: {
          associate_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          person_id?: string | null
          request_status?: Database["public"]["Enums"]["dsar_status"]
          request_type: Database["public"]["Enums"]["dsar_type"]
          requested_at?: string
          responded_at?: string | null
          response_text?: string | null
          updated_at?: string
        }
        Update: {
          associate_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          person_id?: string | null
          request_status?: Database["public"]["Enums"]["dsar_status"]
          request_type?: Database["public"]["Enums"]["dsar_type"]
          requested_at?: string
          responded_at?: string | null
          response_text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_requests_associate_id_fkey"
            columns: ["associate_id"]
            isOneToOne: false
            referencedRelation: "associates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_requests_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          description: string | null
          doc_type: Database["public"]["Enums"]["document_type"]
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          is_public: boolean
          reference_date: string | null
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          doc_type?: Database["public"]["Enums"]["document_type"]
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          is_public?: boolean
          reference_date?: string | null
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          doc_type?: Database["public"]["Enums"]["document_type"]
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          is_public?: boolean
          reference_date?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          id: string
          notes: string | null
          paid_at: string | null
          receipt_url: string | null
          updated_at: string
          vendor: string | null
        }
        Insert: {
          amount: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          description: string
          expense_date?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          receipt_url?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          receipt_url?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Relationships: []
      }
      function_permissions: {
        Row: {
          created_at: string
          function_id: string
          id: string
          permission: Database["public"]["Enums"]["module_permission"]
        }
        Insert: {
          created_at?: string
          function_id: string
          id?: string
          permission: Database["public"]["Enums"]["module_permission"]
        }
        Update: {
          created_at?: string
          function_id?: string
          id?: string
          permission?: Database["public"]["Enums"]["module_permission"]
        }
        Relationships: [
          {
            foreignKeyName: "function_permissions_function_id_fkey"
            columns: ["function_id"]
            isOneToOne: false
            referencedRelation: "functions"
            referencedColumns: ["id"]
          },
        ]
      }
      functions: {
        Row: {
          category: Database["public"]["Enums"]["function_category"]
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["function_category"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["function_category"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      lgpd_consents: {
        Row: {
          associate_id: string | null
          consent_date: string | null
          consent_status: Database["public"]["Enums"]["consent_status"]
          consent_type: Database["public"]["Enums"]["consent_type"]
          created_at: string
          id: string
          ip_address: string | null
          notes: string | null
          person_id: string | null
          revocation_date: string | null
          updated_at: string
        }
        Insert: {
          associate_id?: string | null
          consent_date?: string | null
          consent_status?: Database["public"]["Enums"]["consent_status"]
          consent_type: Database["public"]["Enums"]["consent_type"]
          created_at?: string
          id?: string
          ip_address?: string | null
          notes?: string | null
          person_id?: string | null
          revocation_date?: string | null
          updated_at?: string
        }
        Update: {
          associate_id?: string | null
          consent_date?: string | null
          consent_status?: Database["public"]["Enums"]["consent_status"]
          consent_type?: Database["public"]["Enums"]["consent_type"]
          created_at?: string
          id?: string
          ip_address?: string | null
          notes?: string | null
          person_id?: string | null
          revocation_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lgpd_consents_associate_id_fkey"
            columns: ["associate_id"]
            isOneToOne: false
            referencedRelation: "associates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lgpd_consents_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      palestras: {
        Row: {
          created_at: string
          data: string
          dia_semana: string
          hora: string
          id: string
          palestrante: string
          tema: string
        }
        Insert: {
          created_at?: string
          data: string
          dia_semana: string
          hora?: string
          id?: string
          palestrante?: string
          tema: string
        }
        Update: {
          created_at?: string
          data?: string
          dia_semana?: string
          hora?: string
          id?: string
          palestrante?: string
          tema?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          address: Json | null
          birth_date: string | null
          cpf: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          photo_url: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: Json | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: Json | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      person_roles: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          notes: string | null
          person_id: string
          role: Database["public"]["Enums"]["person_role"]
          started_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          person_id: string
          role: Database["public"]["Enums"]["person_role"]
          started_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          notes?: string | null
          person_id?: string
          role?: Database["public"]["Enums"]["person_role"]
          started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "person_roles_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          accepts_volunteers: boolean
          content: string | null
          cover_url: string | null
          display_order: number
          is_public: boolean
          schedule: string | null
          slug: string | null
          summary: string | null
          tags: string[]
          coordinator_id: string | null
          created_at: string
          description: string | null
          ended_at: string | null
          id: string
          name: string
          started_at: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          accepts_volunteers?: boolean
          content?: string | null
          cover_url?: string | null
          display_order?: number
          is_public?: boolean
          schedule?: string | null
          slug?: string | null
          summary?: string | null
          tags?: string[]
          coordinator_id?: string | null
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          name: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          accepts_volunteers?: boolean
          content?: string | null
          cover_url?: string | null
          display_order?: number
          is_public?: boolean
          schedule?: string | null
          slug?: string | null
          summary?: string | null
          tags?: string[]
          coordinator_id?: string | null
          created_at?: string
          description?: string | null
          ended_at?: string | null
          id?: string
          name?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_coordinator_id_fkey"
            columns: ["coordinator_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      secretaria_actions: {
        Row: {
          action_date: string | null
          action_status: Database["public"]["Enums"]["action_status"]
          created_at: string
          description: string | null
          id: string
          published_by: string | null
          secretaria_id: string
          title: string
          updated_at: string
        }
        Insert: {
          action_date?: string | null
          action_status?: Database["public"]["Enums"]["action_status"]
          created_at?: string
          description?: string | null
          id?: string
          published_by?: string | null
          secretaria_id: string
          title: string
          updated_at?: string
        }
        Update: {
          action_date?: string | null
          action_status?: Database["public"]["Enums"]["action_status"]
          created_at?: string
          description?: string | null
          id?: string
          published_by?: string | null
          secretaria_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "secretaria_actions_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "secretarias"
            referencedColumns: ["id"]
          },
        ]
      }
      secretaria_members: {
        Row: {
          associate_id: string | null
          id: string
          joined_at: string
          member_role: Database["public"]["Enums"]["secretaria_member_role"]
          person_id: string | null
          secretaria_id: string
        }
        Insert: {
          associate_id?: string | null
          id?: string
          joined_at?: string
          member_role?: Database["public"]["Enums"]["secretaria_member_role"]
          person_id?: string | null
          secretaria_id: string
        }
        Update: {
          associate_id?: string | null
          id?: string
          joined_at?: string
          member_role?: Database["public"]["Enums"]["secretaria_member_role"]
          person_id?: string | null
          secretaria_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "secretaria_members_associate_id_fkey"
            columns: ["associate_id"]
            isOneToOne: false
            referencedRelation: "associates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secretaria_members_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secretaria_members_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "secretarias"
            referencedColumns: ["id"]
          },
        ]
      }
      secretaria_responsibilities: {
        Row: {
          created_at: string
          description: string | null
          id: string
          item_order: number
          secretaria_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          item_order?: number
          secretaria_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          item_order?: number
          secretaria_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "secretaria_responsibilities_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "secretarias"
            referencedColumns: ["id"]
          },
        ]
      }
      secretarias: {
        Row: {
          coordinator_id: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          coordinator_id?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          coordinator_id?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "secretarias_coordinator_id_fkey"
            columns: ["coordinator_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      site_events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_time: string | null
          event_date: string
          event_type: Database["public"]["Enums"]["site_event_type"]
          id: string
          is_published: boolean
          location: string | null
          speaker: string | null
          start_time: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          event_date: string
          event_type?: Database["public"]["Enums"]["site_event_type"]
          id?: string
          is_published?: boolean
          location?: string | null
          speaker?: string | null
          start_time?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          event_date?: string
          event_type?: Database["public"]["Enums"]["site_event_type"]
          id?: string
          is_published?: boolean
          location?: string | null
          speaker?: string | null
          start_time?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      spiritual_sessions: {
        Row: {
          anonymous_name: string | null
          associate_id: string | null
          attendant_name: string | null
          created_at: string
          created_by: string | null
          id: string
          is_anonymous: boolean
          notes: string | null
          person_id: string | null
          scheduled_date: string
          session_status: Database["public"]["Enums"]["session_status"]
          session_type: Database["public"]["Enums"]["session_type"]
          updated_at: string
        }
        Insert: {
          anonymous_name?: string | null
          associate_id?: string | null
          attendant_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_anonymous?: boolean
          notes?: string | null
          person_id?: string | null
          scheduled_date: string
          session_status?: Database["public"]["Enums"]["session_status"]
          session_type?: Database["public"]["Enums"]["session_type"]
          updated_at?: string
        }
        Update: {
          anonymous_name?: string | null
          associate_id?: string | null
          attendant_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_anonymous?: boolean
          notes?: string | null
          person_id?: string | null
          scheduled_date?: string
          session_status?: Database["public"]["Enums"]["session_status"]
          session_type?: Database["public"]["Enums"]["session_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spiritual_sessions_associate_id_fkey"
            columns: ["associate_id"]
            isOneToOne: false
            referencedRelation: "associates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spiritual_sessions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      volunteer_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          interest_area: string | null
          message: string | null
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          interest_area?: string | null
          message?: string | null
          name: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          interest_area?: string | null
          message?: string | null
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      votes: {
        Row: {
          agenda_item_id: string
          associate_id: string | null
          id: string
          person_id: string | null
          vote: Database["public"]["Enums"]["vote_option"]
          voted_at: string
        }
        Insert: {
          agenda_item_id: string
          associate_id?: string | null
          id?: string
          person_id?: string | null
          vote: Database["public"]["Enums"]["vote_option"]
          voted_at?: string
        }
        Update: {
          agenda_item_id?: string
          associate_id?: string | null
          id?: string
          person_id?: string | null
          vote?: Database["public"]["Enums"]["vote_option"]
          voted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_agenda_item_id_fkey"
            columns: ["agenda_item_id"]
            isOneToOne: false
            referencedRelation: "agenda_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_associate_id_fkey"
            columns: ["associate_id"]
            isOneToOne: false
            referencedRelation: "associates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_assignments: {
        Row: {
          assigned_by: string | null
          context_id: string | null
          context_type: Database["public"]["Enums"]["assignment_context"]
          created_at: string
          ended_at: string | null
          function_id: string
          id: string
          notes: string | null
          person_id: string
          started_at: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          context_id?: string | null
          context_type?: Database["public"]["Enums"]["assignment_context"]
          created_at?: string
          ended_at?: string | null
          function_id: string
          id?: string
          notes?: string | null
          person_id: string
          started_at?: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          context_id?: string | null
          context_type?: Database["public"]["Enums"]["assignment_context"]
          created_at?: string
          ended_at?: string | null
          function_id?: string
          id?: string
          notes?: string | null
          person_id?: string
          started_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_assignments_function_id_fkey"
            columns: ["function_id"]
            isOneToOne: false
            referencedRelation: "functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_assignments_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_has_permission: {
        Args: { _perm: Database["public"]["Enums"]["module_permission"] }
        Returns: boolean
      }
      get_person_permissions: {
        Args: { _person_id: string }
        Returns: Database["public"]["Enums"]["module_permission"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      normalize_cpf: { Args: { v: string }; Returns: string }
    }
    Enums: {
      action_status: "planejada" | "em_andamento" | "concluida" | "cancelada"
      app_role: "admin" | "gestor" | "trabalhador" | "aluno"
      assembly_status: "convocada" | "em_andamento" | "encerrada" | "cancelada"
      assembly_type: "ordinaria" | "extraordinaria"
      assignment_context: "casa" | "secretaria" | "projeto"
      associate_category:
        | "fundador"
        | "efetivo"
        | "colaborador"
        | "frequentador"
      associate_status: "ativo" | "inadimplente" | "afastado" | "desligado"
      consent_status: "concedido" | "revogado" | "pendente"
      consent_type:
        | "dados_pessoais"
        | "comunicacao"
        | "imagem"
        | "dados_saude"
        | "cookies"
      document_type:
        | "ata"
        | "balancete"
        | "regulamento"
        | "estatuto"
        | "relatorio"
        | "outro"
      dsar_status: "aberta" | "em_analise" | "concluida" | "recusada"
      dsar_type:
        | "acesso"
        | "retificacao"
        | "exclusao"
        | "portabilidade"
        | "oposicao"
      expense_category:
        | "manutencao"
        | "material"
        | "evento"
        | "projeto_social"
        | "administrativo"
        | "outros"
      function_category:
        | "atendimento_espiritual"
        | "apoio_operacional"
        | "estrutura_organizacional"
      membership_category: "fundador" | "efetivo" | "colaborador"
      membership_status: "ativo" | "inadimplente" | "afastado" | "desligado"
      module_permission:
        | "modulo_macas"
        | "modulo_passes"
        | "modulo_dialogo"
        | "modulo_recepcao"
        | "modulo_formacao"
        | "modulo_secretaria"
        | "modulo_projetos"
        | "modulo_gestao"
        | "modulo_financeiro"
        | "modulo_admin"
      person_role:
        | "trabalhador"
        | "frequentador"
        | "beneficiario_social"
        | "doador"
      project_status: "planejamento" | "ativo" | "encerrado"
      secretaria_member_role: "coordenador" | "participante"
      session_status: "agendada" | "realizada" | "cancelada"
      session_type: "passe" | "orientacao" | "desobsessao" | "estudo" | "outro"
      site_event_type: "palestra" | "evento" | "acao_social" | "curso" | "outro"
      vote_option: "sim" | "nao" | "abstencao"
      worker_function:
        | "mediunidade"
        | "dialogador"
        | "recepcao"
        | "coordenacao_passe"
        | "evangelizacao"
        | "administrativo"
        | "outro"
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
      action_status: ["planejada", "em_andamento", "concluida", "cancelada"],
      app_role: ["admin", "gestor", "trabalhador", "aluno"],
      assembly_status: ["convocada", "em_andamento", "encerrada", "cancelada"],
      assembly_type: ["ordinaria", "extraordinaria"],
      assignment_context: ["casa", "secretaria", "projeto"],
      associate_category: [
        "fundador",
        "efetivo",
        "colaborador",
        "frequentador",
      ],
      associate_status: ["ativo", "inadimplente", "afastado", "desligado"],
      consent_status: ["concedido", "revogado", "pendente"],
      consent_type: [
        "dados_pessoais",
        "comunicacao",
        "imagem",
        "dados_saude",
        "cookies",
      ],
      document_type: [
        "ata",
        "balancete",
        "regulamento",
        "estatuto",
        "relatorio",
        "outro",
      ],
      dsar_status: ["aberta", "em_analise", "concluida", "recusada"],
      dsar_type: [
        "acesso",
        "retificacao",
        "exclusao",
        "portabilidade",
        "oposicao",
      ],
      expense_category: [
        "manutencao",
        "material",
        "evento",
        "projeto_social",
        "administrativo",
        "outros",
      ],
      function_category: [
        "atendimento_espiritual",
        "apoio_operacional",
        "estrutura_organizacional",
      ],
      membership_category: ["fundador", "efetivo", "colaborador"],
      membership_status: ["ativo", "inadimplente", "afastado", "desligado"],
      module_permission: [
        "modulo_macas",
        "modulo_passes",
        "modulo_dialogo",
        "modulo_recepcao",
        "modulo_formacao",
        "modulo_secretaria",
        "modulo_projetos",
        "modulo_gestao",
        "modulo_financeiro",
        "modulo_admin",
      ],
      person_role: [
        "trabalhador",
        "frequentador",
        "beneficiario_social",
        "doador",
      ],
      project_status: ["planejamento", "ativo", "encerrado"],
      secretaria_member_role: ["coordenador", "participante"],
      session_status: ["agendada", "realizada", "cancelada"],
      session_type: ["passe", "orientacao", "desobsessao", "estudo", "outro"],
      site_event_type: ["palestra", "evento", "acao_social", "curso", "outro"],
      vote_option: ["sim", "nao", "abstencao"],
      worker_function: [
        "mediunidade",
        "dialogador",
        "recepcao",
        "coordenacao_passe",
        "evangelizacao",
        "administrativo",
        "outro",
      ],
    },
  },
} as const
