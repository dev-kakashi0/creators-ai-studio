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
      billing_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
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
      coupons: {
        Row: {
          active: boolean
          amount_off: number | null
          code: string
          created_at: string
          currency: string | null
          description: string | null
          expires_at: string | null
          max_redemptions: number | null
          percent_off: number | null
          plan_id: string | null
          redeemed_count: number
          trial_days: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount_off?: number | null
          code: string
          created_at?: string
          currency?: string | null
          description?: string | null
          expires_at?: string | null
          max_redemptions?: number | null
          percent_off?: number | null
          plan_id?: string | null
          redeemed_count?: number
          trial_days?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount_off?: number | null
          code?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          expires_at?: string | null
          max_redemptions?: number | null
          percent_off?: number | null
          plan_id?: string | null
          redeemed_count?: number
          trial_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupons_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
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
      invoices: {
        Row: {
          amount: number
          currency: string
          id: string
          issued_at: string
          label: string
          number: string
          payment_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          currency?: string
          id?: string
          issued_at?: string
          label: string
          number: string
          payment_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          currency?: string
          id?: string
          issued_at?: string
          label?: string
          number?: string
          payment_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      pack_prices: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          pack_id: string
          region: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency: string
          id?: string
          pack_id: string
          region?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          pack_id?: string
          region?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pack_prices_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "credit_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_providers: {
        Row: {
          configured: boolean
          created_at: string
          currencies: Json
          description: string | null
          enabled: boolean
          id: string
          methods: Json
          mode: string
          name: string
          region: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          configured?: boolean
          created_at?: string
          currencies?: Json
          description?: string | null
          enabled?: boolean
          id: string
          methods?: Json
          mode?: string
          name: string
          region?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          configured?: boolean
          created_at?: string
          currencies?: Json
          description?: string | null
          enabled?: boolean
          id?: string
          methods?: Json
          mode?: string
          name?: string
          region?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          country: string | null
          coupon_code: string | null
          created_at: string
          credits_granted: number
          currency: string
          failure_reason: string | null
          id: string
          kind: string
          method: string | null
          pack_id: string | null
          plan_id: string | null
          provider: string
          reference: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          country?: string | null
          coupon_code?: string | null
          created_at?: string
          credits_granted?: number
          currency?: string
          failure_reason?: string | null
          id?: string
          kind?: string
          method?: string | null
          pack_id?: string | null
          plan_id?: string | null
          provider: string
          reference?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          country?: string | null
          coupon_code?: string | null
          created_at?: string
          credits_granted?: number
          currency?: string
          failure_reason?: string | null
          id?: string
          kind?: string
          method?: string | null
          pack_id?: string | null
          plan_id?: string | null
          provider?: string
          reference?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_prices: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          interval: string
          plan_id: string
          region: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency: string
          id?: string
          interval?: string
          plan_id: string
          region?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          interval?: string
          plan_id?: string
          region?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_prices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
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
      subscriptions: {
        Row: {
          amount: number
          cancel_at_period_end: boolean
          coupon_code: string | null
          created_at: string
          currency: string
          current_period_end: string | null
          current_period_start: string
          grace_until: string | null
          id: string
          interval: string
          plan_id: string
          provider: string | null
          provider_reference: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          cancel_at_period_end?: boolean
          coupon_code?: string | null
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string
          grace_until?: string | null
          id?: string
          interval?: string
          plan_id: string
          provider?: string | null
          provider_reference?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          cancel_at_period_end?: boolean
          coupon_code?: string | null
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string
          grace_until?: string | null
          id?: string
          interval?: string
          plan_id?: string
          provider?: string | null
          provider_reference?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
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
      is_current_user_admin: { Args: never; Returns: boolean }
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
