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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      copies: {
        Row: {
          brief: string | null
          content: string | null
          created_at: string
          id: string
          is_favorite: boolean
          kind: string
          title: string | null
          user_id: string
        }
        Insert: {
          brief?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_favorite?: boolean
          kind?: string
          title?: string | null
          user_id: string
        }
        Update: {
          brief?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_favorite?: boolean
          kind?: string
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      ebook_versions: {
        Row: {
          created_at: string
          ebook_id: string
          id: string
          label: string | null
          snapshot: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          ebook_id: string
          id?: string
          label?: string | null
          snapshot: Json
          user_id: string
        }
        Update: {
          created_at?: string
          ebook_id?: string
          id?: string
          label?: string | null
          snapshot?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ebook_versions_ebook_id_fkey"
            columns: ["ebook_id"]
            isOneToOne: false
            referencedRelation: "ebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      ebooks: {
        Row: {
          audience: string | null
          chapters: Json
          cover_url: string | null
          created_at: string
          id: string
          is_favorite: boolean
          language: string
          outline: Json
          status: string
          title: string
          tone: string | null
          topic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          audience?: string | null
          chapters?: Json
          cover_url?: string | null
          created_at?: string
          id?: string
          is_favorite?: boolean
          language?: string
          outline?: Json
          status?: string
          title?: string
          tone?: string | null
          topic?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          audience?: string | null
          chapters?: Json
          cover_url?: string | null
          created_at?: string
          id?: string
          is_favorite?: boolean
          language?: string
          outline?: Json
          status?: string
          title?: string
          tone?: string | null
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      images: {
        Row: {
          created_at: string
          id: string
          is_favorite: boolean
          kind: string
          prompt: string
          title: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_favorite?: boolean
          kind?: string
          prompt: string
          title?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_favorite?: boolean
          kind?: string
          prompt?: string
          title?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          credits: number
          full_name: string | null
          id: string
          notifications_enabled: boolean
          plan: string
          theme: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          full_name?: string | null
          id: string
          notifications_enabled?: boolean
          plan?: string
          theme?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          full_name?: string | null
          id?: string
          notifications_enabled?: boolean
          plan?: string
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          avatar: string | null
          created_at: string
          id: string
          is_favorite: boolean
          script: string | null
          status: string
          title: string | null
          url: string | null
          user_id: string
          voice: string | null
        }
        Insert: {
          avatar?: string | null
          created_at?: string
          id?: string
          is_favorite?: boolean
          script?: string | null
          status?: string
          title?: string | null
          url?: string | null
          user_id: string
          voice?: string | null
        }
        Update: {
          avatar?: string | null
          created_at?: string
          id?: string
          is_favorite?: boolean
          script?: string | null
          status?: string
          title?: string | null
          url?: string | null
          user_id?: string
          voice?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_credits: {
        Args: { _amount: number; _reason: string }
        Returns: number
      }
      consume_credits_for: {
        Args: { _amount: number; _reason: string; _user_id: string }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
