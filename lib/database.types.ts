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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activities: {
        Row: {
          child_id: string
          created_at: string | null
          id: string
          recorded_at: string
          type: string
          value: Json
        }
        Insert: {
          child_id: string
          created_at?: string | null
          id?: string
          recorded_at?: string
          type: string
          value?: Json
        }
        Update: {
          child_id?: string
          created_at?: string | null
          id?: string
          recorded_at?: string
          type?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "activities_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          acknowledged: boolean | null
          child_id: string
          created_at: string | null
          id: string
          message: string
          severity: string | null
          type: string
        }
        Insert: {
          acknowledged?: boolean | null
          child_id: string
          created_at?: string | null
          id?: string
          message: string
          severity?: string | null
          type: string
        }
        Update: {
          acknowledged?: boolean | null
          child_id?: string
          created_at?: string | null
          id?: string
          message?: string
          severity?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          activity_time: string | null
          avatar_url: string | null
          bedtime: string | null
          bmi: number | null
          breakfast_time: string | null
          created_at: string | null
          date_of_birth: string | null
          deleted_at: string | null
          dinner_time: string | null
          gender: string | null
          height_cm: number | null
          id: string
          learn_time: string | null
          lunch_time: string | null
          max_screen_time_minutes: number | null
          min_sleep_minutes: number | null
          name: string
          nap_time: string | null
          notifications: Json | null
          parent_id: string
          snack_time: string | null
          updated_at: string | null
          wake_up_time: string | null
          weight_kg: number | null
        }
        Insert: {
          activity_time?: string | null
          avatar_url?: string | null
          bedtime?: string | null
          bmi?: number | null
          breakfast_time?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          dinner_time?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          learn_time?: string | null
          lunch_time?: string | null
          max_screen_time_minutes?: number | null
          min_sleep_minutes?: number | null
          name: string
          nap_time?: string | null
          notifications?: Json | null
          parent_id: string
          snack_time?: string | null
          updated_at?: string | null
          wake_up_time?: string | null
          weight_kg?: number | null
        }
        Update: {
          activity_time?: string | null
          avatar_url?: string | null
          bedtime?: string | null
          bmi?: number | null
          breakfast_time?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          deleted_at?: string | null
          dinner_time?: string | null
          gender?: string | null
          height_cm?: number | null
          id?: string
          learn_time?: string | null
          lunch_time?: string | null
          max_screen_time_minutes?: number | null
          min_sleep_minutes?: number | null
          name?: string
          nap_time?: string | null
          notifications?: Json | null
          parent_id?: string
          snack_time?: string | null
          updated_at?: string | null
          wake_up_time?: string | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          based_on: Json | null
          category: string | null
          child_id: string
          content: string
          created_at: string | null
          id: string
          insight_type: string | null
          priority: string | null
          trend: string | null
        }
        Insert: {
          based_on?: Json | null
          category?: string | null
          child_id: string
          content: string
          created_at?: string | null
          id?: string
          insight_type?: string | null
          priority?: string | null
          trend?: string | null
        }
        Update: {
          based_on?: Json | null
          category?: string | null
          child_id?: string
          content?: string
          created_at?: string | null
          id?: string
          insight_type?: string | null
          priority?: string | null
          trend?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_activities: {
        Row: {
          category: string | null
          child_id: string
          created_at: string | null
          food_groups: string[] | null
          id: string
          max_duration_minutes: number | null
          max_notification_id: string | null
          meal_type: string | null
          min_duration_minutes: number | null
          min_notification_id: string | null
          planned_end_time: string
          start_time: string
          status: string
          type: string
        }
        Insert: {
          category?: string | null
          child_id: string
          created_at?: string | null
          food_groups?: string[] | null
          id?: string
          max_duration_minutes?: number | null
          max_notification_id?: string | null
          meal_type?: string | null
          min_duration_minutes?: number | null
          min_notification_id?: string | null
          planned_end_time: string
          start_time: string
          status?: string
          type: string
        }
        Update: {
          category?: string | null
          child_id?: string
          created_at?: string | null
          food_groups?: string[] | null
          id?: string
          max_duration_minutes?: number | null
          max_notification_id?: string | null
          meal_type?: string | null
          min_duration_minutes?: number | null
          min_notification_id?: string | null
          planned_end_time?: string
          start_time?: string
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_activities_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
