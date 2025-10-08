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
          company_name: string
          created_at: string
          id: string
          industry: string
          mission: string
          past_projects: string
          policies: string | null
          services_offered: string[]
          specializations: string
          team_size: string
          updated_at: string
          user_id: string
          values: string
          years_in_business: string
        }
        Insert: {
          accreditations?: string | null
          company_name: string
          created_at?: string
          id?: string
          industry: string
          mission: string
          past_projects: string
          policies?: string | null
          services_offered?: string[]
          specializations: string
          team_size: string
          updated_at?: string
          user_id: string
          values: string
          years_in_business: string
        }
        Update: {
          accreditations?: string | null
          company_name?: string
          created_at?: string
          id?: string
          industry?: string
          mission?: string
          past_projects?: string
          policies?: string | null
          services_offered?: string[]
          specializations?: string
          team_size?: string
          updated_at?: string
          user_id?: string
          values?: string
          years_in_business?: string
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
      tender_responses: {
        Row: {
          ai_generated_answer: string | null
          company_profile_id: string
          created_at: string
          id: string
          is_approved: boolean | null
          model_used: string | null
          processing_time_ms: number | null
          question: string
          question_index: number | null
          question_type: string | null
          research_used: boolean | null
          response_length: number | null
          tender_id: string
          updated_at: string
          user_edited_answer: string | null
        }
        Insert: {
          ai_generated_answer?: string | null
          company_profile_id: string
          created_at?: string
          id?: string
          is_approved?: boolean | null
          model_used?: string | null
          processing_time_ms?: number | null
          question: string
          question_index?: number | null
          question_type?: string | null
          research_used?: boolean | null
          response_length?: number | null
          tender_id: string
          updated_at?: string
          user_edited_answer?: string | null
        }
        Update: {
          ai_generated_answer?: string | null
          company_profile_id?: string
          created_at?: string
          id?: string
          is_approved?: boolean | null
          model_used?: string | null
          processing_time_ms?: number | null
          question?: string
          question_index?: number | null
          question_type?: string | null
          research_used?: boolean | null
          response_length?: number | null
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
      assign_user_to_company: {
        Args: { company_id: string; member_role?: string; user_email: string }
        Returns: Json
      }
      auto_cleanup_demo_uses: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      check_demo_rate_limit: {
        Args: { email_param: string; ip_param: string }
        Returns: Json
      }
      cleanup_old_demo_pii: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_demo_uses: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_admin_companies_with_stats: {
        Args: Record<PropertyKey, never>
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
        Args: Record<PropertyKey, never>
        Returns: {
          active_companies_30d: number
          total_companies: number
          total_tenders: number
          total_users: number
        }[]
      }
      get_admin_file_upload_stats: {
        Args: Record<PropertyKey, never>
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
        Args: Record<PropertyKey, never>
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
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      get_all_users_for_admin: {
        Args: Record<PropertyKey, never>
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
      get_all_users_for_admin_bypass: {
        Args: Record<PropertyKey, never>
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
      get_all_users_for_admin_test: {
        Args: Record<PropertyKey, never>
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
      get_demo_usage_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          submissions_last_24h: number
          submissions_last_week: number
          total_submissions: number
          unique_companies: number
        }[]
      }
      get_user_company_profile_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
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
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      is_admin: {
        Args: { check_user_id?: string }
        Returns: boolean
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      log_demo_access_attempt: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      log_security_event: {
        Args: { details?: Json; event_type: string }
        Returns: undefined
      }
      make_user_admin: {
        Args: { target_email: string }
        Returns: boolean
      }
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
      remove_user_from_company: {
        Args: { company_id: string; target_user_id: string }
        Returns: Json
      }
      sanitize_filename: {
        Args: { original_name: string }
        Returns: string
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    },
  },
} as const
