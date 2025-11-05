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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      company_documents: {
        Row: {
          company_profile_id: string
          created_at: string
          document_type: string
          extracted_content: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          metadata: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_profile_id: string
          created_at?: string
          document_type: string
          extracted_content?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          metadata?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_profile_id?: string
          created_at?: string
          document_type?: string
          extracted_content?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          metadata?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      company_members: {
        Row: {
          company_profile_id: string
          created_at: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_profile_id: string
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_profile_id?: string
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_profile_id_fkey"
            columns: ["company_profile_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_profiles: {
        Row: {
          accreditations: string | null
          ai_generation_count: number | null
          ai_generation_last_reset: string | null
          billing_period: string | null
          cancel_at_period_end: boolean | null
          company_name: string
          complimentary_reason: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          industry: string
          is_complimentary: boolean | null
          mission: string
          past_projects: string
          plan_name: string | null
          plan_start_date: string | null
          policies: string | null
          seat_limit: number | null
          services_offered: string[]
          specializations: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          team_size: string
          trial_end_date: string | null
          trial_start_date: string | null
          trial_tender_limit: number | null
          trial_tenders_processed: number | null
          updated_at: string
          user_id: string
          values: string
          years_in_business: string
        }
        Insert: {
          accreditations?: string | null
          ai_generation_count?: number | null
          ai_generation_last_reset?: string | null
          billing_period?: string | null
          cancel_at_period_end?: boolean | null
          company_name: string
          complimentary_reason?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          industry: string
          is_complimentary?: boolean | null
          mission: string
          past_projects: string
          plan_name?: string | null
          plan_start_date?: string | null
          policies?: string | null
          seat_limit?: number | null
          services_offered?: string[]
          specializations: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          team_size: string
          trial_end_date?: string | null
          trial_start_date?: string | null
          trial_tender_limit?: number | null
          trial_tenders_processed?: number | null
          updated_at?: string
          user_id: string
          values: string
          years_in_business: string
        }
        Update: {
          accreditations?: string | null
          ai_generation_count?: number | null
          ai_generation_last_reset?: string | null
          billing_period?: string | null
          cancel_at_period_end?: boolean | null
          company_name?: string
          complimentary_reason?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          industry?: string
          is_complimentary?: boolean | null
          mission?: string
          past_projects?: string
          plan_name?: string | null
          plan_start_date?: string | null
          policies?: string | null
          seat_limit?: number | null
          services_offered?: string[]
          specializations?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          team_size?: string
          trial_end_date?: string | null
          trial_start_date?: string | null
          trial_tender_limit?: number | null
          trial_tenders_processed?: number | null
          updated_at?: string
          user_id?: string
          values?: string
          years_in_business?: string
        }
        Relationships: []
      }
      demo_access_logs: {
        Row: {
          access_type: string
          admin_user_id: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          records_accessed: number | null
        }
        Insert: {
          access_type: string
          admin_user_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          records_accessed?: number | null
        }
        Update: {
          access_type?: string
          admin_user_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          records_accessed?: number | null
        }
        Relationships: []
      }
      demo_uses: {
        Row: {
          company_name: string | null
          created_at: string
          email: string
          id: string
          ip_address: string | null
          question: string
          referer: string | null
          user_agent: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
          question: string
          referer?: string | null
          user_agent?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          question?: string
          referer?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      file_upload_logs: {
        Row: {
          company_profile_id: string | null
          created_at: string | null
          file_size: number
          id: string
          ip_address: string | null
          mime_type: string | null
          original_filename: string
          sanitized_filename: string
          upload_success: boolean | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          company_profile_id?: string | null
          created_at?: string | null
          file_size: number
          id?: string
          ip_address?: string | null
          mime_type?: string | null
          original_filename: string
          sanitized_filename: string
          upload_success?: boolean | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          company_profile_id?: string | null
          created_at?: string | null
          file_size?: number
          id?: string
          ip_address?: string | null
          mime_type?: string | null
          original_filename?: string
          sanitized_filename?: string
          upload_success?: boolean | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          client_name: string | null
          company_profile_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          client_name?: string | null
          company_profile_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          client_name?: string | null
          company_profile_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      qa_memory: {
        Row: {
          answer: string
          company_profile_id: string
          confidence_score: number | null
          created_at: string
          id: string
          question: string
          question_embedding: string | null
          source_tender_id: string | null
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          answer: string
          company_profile_id: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          question: string
          question_embedding?: string | null
          source_tender_id?: string | null
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          answer?: string
          company_profile_id?: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          question?: string
          question_embedding?: string | null
          source_tender_id?: string | null
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "qa_memory_company_profile_id_fkey"
            columns: ["company_profile_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_memory_source_tender_id_fkey"
            columns: ["source_tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      role_change_logs: {
        Row: {
          changed_by: string | null
          company_id: string | null
          created_at: string | null
          id: string
          new_role: string | null
          old_role: string | null
          target_user: string | null
        }
        Insert: {
          changed_by?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          new_role?: string | null
          old_role?: string | null
          target_user?: string | null
        }
        Update: {
          changed_by?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          new_role?: string | null
          old_role?: string | null
          target_user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_change_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          created_at: string | null
          details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      subscription_events: {
        Row: {
          company_profile_id: string | null
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          stripe_event_id: string | null
        }
        Insert: {
          company_profile_id?: string | null
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          stripe_event_id?: string | null
        }
        Update: {
          company_profile_id?: string | null
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          stripe_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_company_profile_id_fkey"
            columns: ["company_profile_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_prices: {
        Row: {
          billing_period: string
          created_at: string | null
          id: string
          is_active: boolean | null
          plan_name: string
          price_gbp: number
          seats: number
          stripe_price_id: string | null
        }
        Insert: {
          billing_period: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          plan_name: string
          price_gbp: number
          seats: number
          stripe_price_id?: string | null
        }
        Update: {
          billing_period?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          plan_name?: string
          price_gbp?: number
          seats?: number
          stripe_price_id?: string | null
        }
        Relationships: []
      }
      tender_responses: {
        Row: {
          ai_generated_answer: string | null
          chunk_index: number | null
          company_profile_id: string
          created_at: string
          id: string
          is_approved: boolean | null
          model_used: string | null
          original_line_number: number | null
          original_reference: string | null
          page_number: number | null
          processing_time_ms: number | null
          question: string
          question_index: number | null
          question_type: string | null
          research_used: boolean | null
          response_length: number | null
          section_name: string | null
          sheet_name: string | null
          source_confidence: number | null
          source_location: string | null
          tender_id: string
          updated_at: string
          user_edited_answer: string | null
        }
        Insert: {
          ai_generated_answer?: string | null
          chunk_index?: number | null
          company_profile_id: string
          created_at?: string
          id?: string
          is_approved?: boolean | null
          model_used?: string | null
          original_line_number?: number | null
          original_reference?: string | null
          page_number?: number | null
          processing_time_ms?: number | null
          question: string
          question_index?: number | null
          question_type?: string | null
          research_used?: boolean | null
          response_length?: number | null
          section_name?: string | null
          sheet_name?: string | null
          source_confidence?: number | null
          source_location?: string | null
          tender_id: string
          updated_at?: string
          user_edited_answer?: string | null
        }
        Update: {
          ai_generated_answer?: string | null
          chunk_index?: number | null
          company_profile_id?: string
          created_at?: string
          id?: string
          is_approved?: boolean | null
          model_used?: string | null
          original_line_number?: number | null
          original_reference?: string | null
          page_number?: number | null
          processing_time_ms?: number | null
          question?: string
          question_index?: number | null
          question_type?: string | null
          research_used?: boolean | null
          response_length?: number | null
          section_name?: string | null
          sheet_name?: string | null
          source_confidence?: number | null
          source_location?: string | null
          tender_id?: string
          updated_at?: string
          user_edited_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_tender_responses_company_profile"
            columns: ["company_profile_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tender_responses_tender"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_responses_company_profile_id_fkey"
            columns: ["company_profile_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_responses_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tenders: {
        Row: {
          company_profile_id: string
          content_segments_count: number | null
          created_at: string
          deadline: string | null
          error_message: string | null
          extracted_context: Json | null
          extracted_instructions: Json | null
          extracted_other: Json | null
          extracted_questions: Json | null
          file_type_detected: string | null
          file_url: string
          id: string
          last_activity_at: string | null
          original_filename: string
          parsed_data: Json | null
          processed_questions: number
          processing_stage: string | null
          progress: number
          project_id: string | null
          status: string
          title: string
          total_questions: number
          updated_at: string
          user_id: string
          value: number | null
        }
        Insert: {
          company_profile_id: string
          content_segments_count?: number | null
          created_at?: string
          deadline?: string | null
          error_message?: string | null
          extracted_context?: Json | null
          extracted_instructions?: Json | null
          extracted_other?: Json | null
          extracted_questions?: Json | null
          file_type_detected?: string | null
          file_url: string
          id?: string
          last_activity_at?: string | null
          original_filename: string
          parsed_data?: Json | null
          processed_questions?: number
          processing_stage?: string | null
          progress?: number
          project_id?: string | null
          status?: string
          title: string
          total_questions?: number
          updated_at?: string
          user_id: string
          value?: number | null
        }
        Update: {
          company_profile_id?: string
          content_segments_count?: number | null
          created_at?: string
          deadline?: string | null
          error_message?: string | null
          extracted_context?: Json | null
          extracted_instructions?: Json | null
          extracted_other?: Json | null
          extracted_questions?: Json | null
          file_type_detected?: string | null
          file_url?: string
          id?: string
          last_activity_at?: string | null
          original_filename?: string
          parsed_data?: Json | null
          processed_questions?: number
          processing_stage?: string | null
          progress?: number
          project_id?: string | null
          status?: string
          title?: string
          total_questions?: number
          updated_at?: string
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_tenders_company_profile"
            columns: ["company_profile_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tenders_company_profile_id"
            columns: ["company_profile_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenders_company_profile_id_fkey"
            columns: ["company_profile_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
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
      add_team_member: {
        Args: { member_email: string; member_role?: string }
        Returns: Json
      }
      admin_create_company: {
        Args: {
          p_company_name: string
          p_industry: string
          p_mission?: string
          p_past_projects?: string
          p_services_offered?: string[]
          p_specializations?: string
          p_team_size: string
          p_values?: string
          p_years_in_business?: string
          target_user_id: string
        }
        Returns: Json
      }
      admin_create_user: {
        Args: { target_user_email: string; target_user_password: string }
        Returns: Json
      }
      admin_delete_tender: { Args: { tender_id: string }; Returns: Json }
      admin_delete_user: { Args: { target_user_email: string }; Returns: Json }
      admin_grant_complimentary_access: {
        Args: {
          p_plan_name: string
          p_reason: string
          target_company_id: string
        }
        Returns: Json
      }
      admin_reset_user_password: {
        Args: { target_user_email: string }
        Returns: Json
      }
      admin_revoke_complimentary_access: {
        Args: { target_company_id: string }
        Returns: Json
      }
      assign_user_to_company: {
        Args: { company_id: string; member_role?: string; user_email: string }
        Returns: Json
      }
      auto_cleanup_demo_uses: { Args: never; Returns: undefined }
      can_create_tender: { Args: never; Returns: Json }
      check_ai_generation_limit: {
        Args: { user_id_param: string }
        Returns: Json
      }
      check_demo_rate_limit: {
        Args: { email_param: string; ip_param: string }
        Returns: Json
      }
      cleanup_old_demo_pii: { Args: never; Returns: undefined }
      cleanup_old_demo_uses: { Args: never; Returns: undefined }
      get_admin_companies_with_stats: {
        Args: never
        Returns: {
          company_name: string
          created_at: string
          id: string
          industry: string
          last_tender_date: string
          project_count: number
          team_size: string
          tender_count: number
          updated_at: string
          user_count: number
        }[]
      }
      get_admin_dashboard_stats: {
        Args: never
        Returns: {
          active_companies_30d: number
          total_companies: number
          total_tenders: number
          total_users: number
        }[]
      }
      get_admin_file_upload_stats: {
        Args: never
        Returns: {
          failed_uploads: number
          recent_uploads: Json
          successful_uploads: number
          total_size: number
          total_uploads: number
        }[]
      }
      get_admin_table_data: {
        Args: { p_limit?: number; p_table_name: string }
        Returns: Json
      }
      get_admin_table_stats: {
        Args: never
        Returns: {
          row_count: number
          table_name: string
        }[]
      }
      get_admin_tender_stats: {
        Args: { days_back?: number }
        Returns: {
          date: string
          response_count: number
          tender_count: number
        }[]
      }
      get_admin_top_companies: {
        Args: { limit_count?: number }
        Returns: {
          company_name: string
          last_active: string
          response_count: number
          tender_count: number
        }[]
      }
      get_admin_users: {
        Args: never
        Returns: {
          created_at: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      get_all_users_for_admin: {
        Args: never
        Returns: {
          company_created_at: string
          company_name: string
          company_profile_id: string
          company_updated_at: string
          created_at: string
          email: string
          email_confirmed_at: string
          has_company_profile: boolean
          industry: string
          last_sign_in_at: string
          team_size: string
          user_id: string
        }[]
      }
      get_company_members: {
        Args: { company_id: string }
        Returns: {
          email: string
          joined_at: string
          last_sign_in: string
          role: string
          user_id: string
        }[]
      }
      get_company_seat_usage: { Args: { p_company_id: string }; Returns: Json }
      get_demo_usage_stats: {
        Args: never
        Returns: {
          submissions_last_24h: number
          submissions_last_week: number
          total_submissions: number
          unique_companies: number
        }[]
      }
      get_subscription_status: { Args: never; Returns: Json }
      get_team_members: {
        Args: never
        Returns: {
          email: string
          joined_at: string
          last_sign_in: string
          role: string
          user_id: string
        }[]
      }
      get_user_company_profile_id: { Args: never; Returns: string }
      get_user_company_role: { Args: never; Returns: string }
      get_user_tenders_for_admin: {
        Args: { target_company_id?: string; target_user_id: string }
        Returns: {
          company_name: string
          created_at: string
          id: string
          processed_questions: number
          status: string
          title: string
          total_questions: number
        }[]
      }
      increment_ai_generation_count: {
        Args: { user_id_param: string }
        Returns: undefined
      }
      increment_trial_tender_count: {
        Args: { company_id: string }
        Returns: undefined
      }
      is_admin: { Args: { check_user_id?: string }; Returns: boolean }
      is_company_admin: { Args: { company_id?: string }; Returns: boolean }
      is_company_owner: { Args: { company_id?: string }; Returns: boolean }
      is_subscription_active: { Args: never; Returns: boolean }
      log_demo_access_attempt: { Args: never; Returns: undefined }
      log_security_event: {
        Args: { details_param?: Json; event_type_param: string }
        Returns: undefined
      }
      make_user_admin: { Args: { target_email: string }; Returns: boolean }
      match_qa_memory: {
        Args: {
          company_id: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          answer: string
          confidence_score: number
          created_at: string
          id: string
          question: string
          similarity: number
          source_tender_id: string
          usage_count: number
        }[]
      }
      remove_team_member: { Args: { member_user_id: string }; Returns: Json }
      remove_user_from_company: {
        Args: { company_id: string; target_user_id: string }
        Returns: Json
      }
      sanitize_filename: { Args: { original_name: string }; Returns: string }
      update_company_plan: {
        Args: { p_plan_name: string; p_seat_limit: number }
        Returns: Json
      }
      update_team_member_role: {
        Args: { member_user_id: string; new_role: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      plan_tier: "Solo" | "Starter" | "Pro" | "Enterprise"
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
      app_role: ["admin", "moderator", "user"],
      plan_tier: ["Solo", "Starter", "Pro", "Enterprise"],
    },
  },
} as const
