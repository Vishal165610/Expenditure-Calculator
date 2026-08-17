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
      activity_log: {
        Row: {
          action_type: string
          actor_id: string
          created_at: string
          description: string
          id: string
          related_expense_id: string | null
        }
        Insert: {
          action_type: string
          actor_id: string
          created_at?: string
          description?: string
          id?: string
          related_expense_id?: string | null
        }
        Update: {
          action_type?: string
          actor_id?: string
          created_at?: string
          description?: string
          id?: string
          related_expense_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_related_expense_id_fkey"
            columns: ["related_expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_log: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      expense_splits: {
        Row: {
          amount_owed: number
          created_at: string
          expense_id: string
          id: string
          owed_by: string
          paid_at: string | null
          proof_url: string | null
          requested_at: string | null
          status: string
        }
        Insert: {
          amount_owed: number
          created_at?: string
          expense_id: string
          id?: string
          owed_by: string
          paid_at?: string | null
          proof_url?: string | null
          requested_at?: string | null
          status?: string
        }
        Update: {
          amount_owed?: number
          created_at?: string
          expense_id?: string
          id?: string
          owed_by?: string
          paid_at?: string | null
          proof_url?: string | null
          requested_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_splits_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          id: string
          notes: string | null
          paid_by: string
          receipt_url: string | null
          split_mode: string
          title: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_by: string
          receipt_url?: string | null
          split_mode?: string
          title: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          id?: string
          notes?: string | null
          paid_by?: string
          receipt_url?: string | null
          split_mode?: string
          title?: string
        }
        Relationships: []
      }
      monthly_summaries: {
        Row: {
          created_at: string
          data: Json
          id: string
          month: number
          year: number
        }
        Insert: {
          created_at?: string
          data: Json
          id?: string
          month: number
          year: number
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          month?: number
          year?: number
        }
        Relationships: []
      }
      notices: {
        Row: {
          author_id: string
          created_at: string
          id: string
          message: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          message: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          message?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          message: string
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          message: string
          read?: boolean
          type?: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          id: string
          notes: string | null
          spent_on: string
          title: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          id?: string
          notes?: string | null
          spent_on?: string
          title: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          id?: string
          notes?: string | null
          spent_on?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_color: string
          created_at: string
          id: string
          name: string
          upi_id: string | null
          username: string
        }
        Insert: {
          avatar_color?: string
          created_at?: string
          id: string
          name: string
          upi_id?: string | null
          username: string
        }
        Update: {
          avatar_color?: string
          created_at?: string
          id?: string
          name?: string
          upi_id?: string | null
          username?: string
        }
        Relationships: []
      }
      room_bills: {
        Row: {
          cleaning_total: number
          created_at: string
          id: string
          month: number
          rent_total: number
          water_total: number
          year: number
        }
        Insert: {
          cleaning_total?: number
          created_at?: string
          id?: string
          month: number
          rent_total?: number
          water_total?: number
          year: number
        }
        Update: {
          cleaning_total?: number
          created_at?: string
          id?: string
          month?: number
          rent_total?: number
          water_total?: number
          year?: number
        }
        Relationships: []
      }
      utility_readings: {
        Row: {
          created_at: string
          id: string
          logged_by: string | null
          rate_per_unit: number
          reading_date: string
          reading_value: number
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          logged_by?: string | null
          rate_per_unit: number
          reading_date: string
          reading_value: number
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          logged_by?: string | null
          rate_per_unit?: number
          reading_date?: string
          reading_value?: number
          type?: string
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