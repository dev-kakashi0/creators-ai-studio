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
      credit_costs: {
        Row: {
          created_at: string
          credits: number
          description: string | null
          key: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits?: number
          description?: string | null
          key: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits?: number
          description?: string | null
          key?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      credit_packs: {
        Row: {
          created_at: string
          credits: number
          id: string
          name: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits: number
          id: string
          name: string
          price: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits?: number
          id?: string
          name?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string
          id: string
          kind: string
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          created_at?: string
          id?: string
          kind?: string
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string
          id?: string
          kind?: string
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
          author_bio: string | null
          author_name: string | null
          author_photo: string | null
          branding: Json
          chapters: Json
          cover_url: string | null
          created_at: string
          id: string
          illustrations: Json
          is_favorite: boolean
          language: string
          length: string
          logo_url: string | null
          outline: Json
          published_at: string | null
          publisher: string | null
          quality: string
          status: string
          style: string
          subtitle: string | null
          theme: string
          title: string
          tone: string | null
          topic: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          audience?: string | null
          author_bio?: string | null
          author_name?: string | null
          author_photo?: string | null
          branding?: Json
          chapters?: Json
          cover_url?: string | null
          created_at?: string
          id?: string
          illustrations?: Json
          is_favorite?: boolean
          language?: string
          length?: string
          logo_url?: string | null
          outline?: Json
          published_at?: string | null
          publisher?: string | null
          quality?: string
          status?: string
          style?: string
          subtitle?: string | null
          theme?: string
          title?: string
          tone?: string | null
          topic?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          audience?: string | null
          author_bio?: string | null
          author_name?: string | null
          author_photo?: string | null
          branding?: Json
          chapters?: Json
          cover_url?: string | null
          created_at?: string
          id?: string
          illustrations?: Json
          is_favorite?: boolean
          language?: string
          length?: string
          logo_url?: string | null
          outline?: Json
          published_at?: string | null
          publisher?: string | null
          quality?: string
          status?: string
          style?: string
          subtitle?: string | null
          theme?: string
          title?: string
          tone?: string | null
          topic?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      generation_jobs: {
        Row: {
          chapters_allowed: number
          chapters_used: number
          covers_allowed: number
          covers_used: number
          created_at: string
          expires_at: string
          id: string
          illustrations_allowed: number
          illustrations_used: number
          kind: string
          outline_allowed: number
          outline_used: number
          user_id: string
        }
        Insert: {
          chapters_allowed?: number
          chapters_used?: number
          covers_allowed?: number
          covers_used?: number
          created_at?: string
          expires_at?: string
          id?: string
          illustrations_allowed?: number
          illustrations_used?: number
          kind: string
          outline_allowed?: number
          outline_used?: number
          user_id: string
        }
        Update: {
          chapters_allowed?: number
          chapters_used?: number
          covers_allowed?: number
          covers_used?: number
          created_at?: string
          expires_at?: string
          id?: string
          illustrations_allowed?: number
          illustrations_used?: number
          kind?: string
          outline_allowed?: number
          outline_used?: number
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
      plans: {
        Row: {
          created_at: string
          features: Json
          id: string
          monthly_credits: number
          name: string
          price_monthly: number
          sort_order: number
          tagline: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          features?: Json
          id: string
          monthly_credits?: number
          name: string
          price_monthly?: number
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          features?: Json
          id?: string
          monthly_credits?: number
          name?: string
          price_monthly?: number
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          credits: number
          credits_renew_at: string | null
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
          credits_renew_at?: string | null
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
          credits_renew_at?: string | null
          full_name?: string | null
          id?: string
          notifications_enabled?: boolean
          plan?: string
          theme?: string
          updated_at?: string
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
      add_credits_for: {
        Args: {
          _amount: number
          _kind: string
          _reason: string
          _user_id: string
        }
        Returns: number
      }
      consume_credits: {
        Args: { _amount: number; _reason: string }
        Returns: number
      }
      consume_credits_for: {
        Args: { _amount: number; _reason: string; _user_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
