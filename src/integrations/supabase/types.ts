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
      ai_history: {
        Row: {
          ai_response: string | null
          created_at: string
          id: string
          message: string
          persona: string | null
          user_id: string
        }
        Insert: {
          ai_response?: string | null
          created_at?: string
          id?: string
          message: string
          persona?: string | null
          user_id: string
        }
        Update: {
          ai_response?: string | null
          created_at?: string
          id?: string
          message?: string
          persona?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          completion_tokens: number | null
          created_at: string
          error: string | null
          fallback_used: boolean
          id: string
          latency_ms: number | null
          model: string
          prompt_tokens: number | null
          provider: string
          requested_model: string | null
          status: string
          total_tokens: number | null
          user_id: string
        }
        Insert: {
          completion_tokens?: number | null
          created_at?: string
          error?: string | null
          fallback_used?: boolean
          id?: string
          latency_ms?: number | null
          model: string
          prompt_tokens?: number | null
          provider: string
          requested_model?: string | null
          status?: string
          total_tokens?: number | null
          user_id: string
        }
        Update: {
          completion_tokens?: number | null
          created_at?: string
          error?: string | null
          fallback_used?: boolean
          id?: string
          latency_ms?: number | null
          model?: string
          prompt_tokens?: number | null
          provider?: string
          requested_model?: string | null
          status?: string
          total_tokens?: number | null
          user_id?: string
        }
        Relationships: []
      }
      automation_logs: {
        Row: {
          action_taken: string
          amount_saved: number | null
          created_at: string
          id: string
          metadata: Json
          result: string
          rule_id: string | null
          rule_name: string
          severity: string
          trigger_reason: string
          user_id: string
        }
        Insert: {
          action_taken: string
          amount_saved?: number | null
          created_at?: string
          id?: string
          metadata?: Json
          result?: string
          rule_id?: string | null
          rule_name: string
          severity?: string
          trigger_reason: string
          user_id: string
        }
        Update: {
          action_taken?: string
          amount_saved?: number | null
          created_at?: string
          id?: string
          metadata?: Json
          result?: string
          rule_id?: string | null
          rule_name?: string
          severity?: string
          trigger_reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          action_config: Json
          action_type: string
          condition_config: Json
          condition_type: string
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          is_prebuilt: boolean
          last_triggered_at: string | null
          name: string
          prebuilt_key: string | null
          tier: string
          trigger_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          action_config?: Json
          action_type: string
          condition_config?: Json
          condition_type: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          is_prebuilt?: boolean
          last_triggered_at?: string | null
          name: string
          prebuilt_key?: string | null
          tier?: string
          trigger_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          action_config?: Json
          action_type?: string
          condition_config?: Json
          condition_type?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          is_prebuilt?: boolean
          last_triggered_at?: string | null
          name?: string
          prebuilt_key?: string | null
          tier?: string
          trigger_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          category: string
          created_at: string
          id: string
          month: string
          monthly_limit: number
          spent_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          month?: string
          monthly_limit: number
          spent_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          month?: string
          monthly_limit?: number
          spent_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          category: string | null
          created_at: string
          current_amount: number
          deadline: string | null
          goal_name: string
          id: string
          target_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          current_amount?: number
          deadline?: string | null
          goal_name: string
          id?: string
          target_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          current_amount?: number
          deadline?: string | null
          goal_name?: string
          id?: string
          target_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          archived: boolean
          created_at: string
          id: string
          link: string | null
          message: string
          metadata: Json
          read: boolean
          severity: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          id?: string
          link?: string | null
          message: string
          metadata?: Json
          read?: boolean
          severity?: string
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          metadata?: Json
          read?: boolean
          severity?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          environment: string
          id: string
          payment_status: string
          plan_name: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          environment?: string
          id?: string
          payment_status: string
          plan_name?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          environment?: string
          id?: string
          payment_status?: string
          plan_name?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ai_usage_limit: number | null
          avatar_url: string | null
          country: string | null
          created_at: string
          currency: string | null
          current_plan: string | null
          email: string | null
          financial_score: number | null
          full_name: string | null
          id: string
          level: number | null
          monthly_income: number | null
          onboarding_completed: boolean | null
          onboarding_data: Json | null
          premium_enabled: boolean | null
          primary_goal: string | null
          selected_persona: string | null
          streak: number | null
          updated_at: string
          voice_enabled: boolean | null
          xp: number | null
        }
        Insert: {
          ai_usage_limit?: number | null
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          current_plan?: string | null
          email?: string | null
          financial_score?: number | null
          full_name?: string | null
          id: string
          level?: number | null
          monthly_income?: number | null
          onboarding_completed?: boolean | null
          onboarding_data?: Json | null
          premium_enabled?: boolean | null
          primary_goal?: string | null
          selected_persona?: string | null
          streak?: number | null
          updated_at?: string
          voice_enabled?: boolean | null
          xp?: number | null
        }
        Update: {
          ai_usage_limit?: number | null
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          current_plan?: string | null
          email?: string | null
          financial_score?: number | null
          full_name?: string | null
          id?: string
          level?: number | null
          monthly_income?: number | null
          onboarding_completed?: boolean | null
          onboarding_data?: Json | null
          premium_enabled?: boolean | null
          primary_goal?: string | null
          selected_persona?: string | null
          streak?: number | null
          updated_at?: string
          voice_enabled?: boolean | null
          xp?: number | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number | null
          billing_cycle: string | null
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          order_id: string | null
          payment_id: string | null
          pending_plan_change: string | null
          pending_plan_change_at: string | null
          plan_name: string | null
          price_id: string | null
          product_id: string | null
          renewal_date: string | null
          start_date: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          billing_cycle?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          order_id?: string | null
          payment_id?: string | null
          pending_plan_change?: string | null
          pending_plan_change_at?: string | null
          plan_name?: string | null
          price_id?: string | null
          product_id?: string | null
          renewal_date?: string | null
          start_date?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          billing_cycle?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          order_id?: string | null
          payment_id?: string | null
          pending_plan_change?: string | null
          pending_plan_change_at?: string | null
          plan_name?: string | null
          price_id?: string | null
          product_id?: string | null
          renewal_date?: string | null
          start_date?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          id: string
          note: string | null
          payment_method: string | null
          recurring: boolean | null
          title: string
          transaction_date: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          id?: string
          note?: string | null
          payment_method?: string | null
          recurring?: boolean | null
          title: string
          transaction_date?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          id?: string
          note?: string | null
          payment_method?: string | null
          recurring?: boolean | null
          title?: string
          transaction_date?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
