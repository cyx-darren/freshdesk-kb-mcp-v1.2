export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      article_cache: {
        Row: {
          article_id: string
          cached_at: string
          data: Json
          expires_at: string
          id: string
        }
        Insert: {
          article_id: string
          cached_at?: string
          data: Json
          expires_at: string
          id?: string
        }
        Update: {
          article_id?: string
          cached_at?: string
          data?: Json
          expires_at?: string
          id?: string
        }
        Relationships: []
      }
      article_drafts: {
        Row: {
          ai_response: string | null
          content: string | null
          created_at: string | null
          folder_id: string | null
          id: string
          original_question: string | null
          seo_description: string | null
          seo_title: string | null
          status: string | null
          tags: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ai_response?: string | null
          content?: string | null
          created_at?: string | null
          folder_id?: string | null
          id?: string
          original_question?: string | null
          seo_description?: string | null
          seo_title?: string | null
          status?: string | null
          tags?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ai_response?: string | null
          content?: string | null
          created_at?: string | null
          folder_id?: string | null
          id?: string
          original_question?: string | null
          seo_description?: string | null
          seo_title?: string | null
          status?: string | null
          tags?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string | null
          session_id: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string | null
          session_id?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string | null
          session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      feedback_submissions: {
        Row: {
          ai_response: string
          assigned_to: string | null
          category_attempted: string | null
          created_at: string
          feedback_type: Database["public"]["Enums"]["feedback_type_enum"]
          id: string
          published_article_id: string | null
          question: string
          status: Database["public"]["Enums"]["feedback_status_enum"]
          user_session_id: string
        }
        Insert: {
          ai_response: string
          assigned_to?: string | null
          category_attempted?: string | null
          created_at?: string
          feedback_type: Database["public"]["Enums"]["feedback_type_enum"]
          id?: string
          published_article_id?: string | null
          question: string
          status?: Database["public"]["Enums"]["feedback_status_enum"]
          user_session_id: string
        }
        Update: {
          ai_response?: string
          assigned_to?: string | null
          category_attempted?: string | null
          created_at?: string
          feedback_type?: Database["public"]["Enums"]["feedback_type_enum"]
          id?: string
          published_article_id?: string | null
          question?: string
          status?: Database["public"]["Enums"]["feedback_status_enum"]
          user_session_id?: string
        }
        Relationships: []
      }
      kb_articles_draft: {
        Row: {
          ai_response: string | null
          content: string | null
          created_at: string | null
          feedback_id: string | null
          folder_id: string | null
          freshdesk_article_id: string | null
          id: string
          original_question: string | null
          seo_description: string | null
          seo_title: string | null
          status: string | null
          tags: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ai_response?: string | null
          content?: string | null
          created_at?: string | null
          feedback_id?: string | null
          folder_id?: string | null
          freshdesk_article_id?: string | null
          id?: string
          original_question?: string | null
          seo_description?: string | null
          seo_title?: string | null
          status?: string | null
          tags?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ai_response?: string | null
          content?: string | null
          created_at?: string | null
          feedback_id?: string | null
          folder_id?: string | null
          freshdesk_article_id?: string | null
          id?: string
          original_question?: string | null
          seo_description?: string | null
          seo_title?: string | null
          status?: string | null
          tags?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          last_login: string | null
          role: string | null
          username: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          last_login?: string | null
          role?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          last_login?: string | null
          role?: string | null
          username?: string | null
        }
        Relationships: []
      }
      search_history: {
        Row: {
          category: string | null
          id: string
          query: string | null
          results_count: number | null
          timestamp: string
          user_id: string
        }
        Insert: {
          category?: string | null
          id?: string
          query?: string | null
          results_count?: number | null
          timestamp?: string
          user_id: string
        }
        Update: {
          category?: string | null
          id?: string
          query?: string | null
          results_count?: number | null
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          id: string
          preferences_json: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          preferences_json?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          preferences_json?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      chat_sessions_with_stats: {
        Row: {
          assistant_message_count: number | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          last_message_at: string | null
          message_count: number | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          user_message_count: number | null
        }
        Relationships: []
      }
      feedback_with_users: {
        Row: {
          ai_response: string | null
          assigned_to: string | null
          assigned_to_email: string | null
          assigned_to_name: string | null
          category_attempted: string | null
          created_at: string | null
          feedback_type:
            | Database["public"]["Enums"]["feedback_type_enum"]
            | null
          id: string | null
          question: string | null
          status: Database["public"]["Enums"]["feedback_status_enum"] | null
          user_session_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_feedback: {
        Args: { feedback_id: string; user_id?: string }
        Returns: boolean
      }
      cleanup_old_chat_sessions: {
        Args: { days_old?: number }
        Returns: number
      }
      get_feedback_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_feedback: number
          pending_feedback: number
          in_progress_feedback: number
          completed_feedback: number
          correct_feedback: number
          incorrect_feedback: number
          needs_improvement_feedback: number
        }[]
      }
      get_my_assigned_feedback: {
        Args: Record<PropertyKey, never>
        Returns: {
          ai_response: string
          assigned_to: string | null
          category_attempted: string | null
          created_at: string
          feedback_type: Database["public"]["Enums"]["feedback_type_enum"]
          id: string
          published_article_id: string | null
          question: string
          status: Database["public"]["Enums"]["feedback_status_enum"]
          user_session_id: string
        }[]
      }
      get_user_chat_stats: {
        Args: { user_uuid: string }
        Returns: {
          total_sessions: number
          total_messages: number
          active_sessions: number
          latest_session_date: string
        }[]
      }
    }
    Enums: {
      feedback_status_enum: "pending" | "in_progress" | "completed"
      feedback_type_enum: "correct" | "incorrect" | "needs_improvement"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      feedback_status_enum: ["pending", "in_progress", "completed"],
      feedback_type_enum: ["correct", "incorrect", "needs_improvement"],
    },
  },
} as const 