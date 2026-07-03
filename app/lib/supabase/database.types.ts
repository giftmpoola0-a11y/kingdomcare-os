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
      care_home_members: {
        Row: {
          care_home_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          care_home_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          care_home_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_home_members_care_home_id_fkey"
            columns: ["care_home_id"]
            isOneToOne: false
            referencedRelation: "care_homes"
            referencedColumns: ["id"]
          },
        ]
      }
      care_homes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      incidents: {
        Row: {
          care_home_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string
          follow_up_notes: string | null
          follow_up_required: boolean
          id: string
          immediate_action: string | null
          incident_type: string
          location: string | null
          occurred_at: string
          reported_by: string | null
          resident_id: string | null
          resolved_at: string | null
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          care_home_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description: string
          follow_up_notes?: string | null
          follow_up_required?: boolean
          id?: string
          immediate_action?: string | null
          incident_type: string
          location?: string | null
          occurred_at?: string
          reported_by?: string | null
          resident_id?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          care_home_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string
          follow_up_notes?: string | null
          follow_up_required?: boolean
          id?: string
          immediate_action?: string | null
          incident_type?: string
          location?: string | null
          occurred_at?: string
          reported_by?: string | null
          resident_id?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_care_home_id_fkey"
            columns: ["care_home_id"]
            isOneToOne: false
            referencedRelation: "care_homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      medication_alerts: {
        Row: {
          alert_type: string
          care_home_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          due_at: string | null
          id: string
          medication_id: string | null
          message: string
          resident_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          alert_type: string
          care_home_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          due_at?: string | null
          id?: string
          medication_id?: string | null
          message: string
          resident_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          alert_type?: string
          care_home_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          due_at?: string | null
          id?: string
          medication_id?: string | null
          message?: string
          resident_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medication_alerts_care_home_id_fkey"
            columns: ["care_home_id"]
            isOneToOne: false
            referencedRelation: "care_homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_alerts_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_alerts_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          care_home_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          dosage: string | null
          end_date: string | null
          frequency: string | null
          id: string
          medication_name: string
          pharmacy: string | null
          prescribing_doctor: string | null
          resident_id: string
          route: string | null
          schedule_notes: string | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          care_home_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          dosage?: string | null
          end_date?: string | null
          frequency?: string | null
          id?: string
          medication_name: string
          pharmacy?: string | null
          prescribing_doctor?: string | null
          resident_id: string
          route?: string | null
          schedule_notes?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          care_home_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          dosage?: string | null
          end_date?: string | null
          frequency?: string | null
          id?: string
          medication_name?: string
          pharmacy?: string | null
          prescribing_doctor?: string | null
          resident_id?: string
          route?: string | null
          schedule_notes?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medications_care_home_id_fkey"
            columns: ["care_home_id"]
            isOneToOne: false
            referencedRelation: "care_homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medications_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      residents: {
        Row: {
          age: number | null
          care_home_id: string
          care_level: string
          created_at: string
          created_by: string
          deleted_at: string | null
          full_name: string
          id: string
          legacy_local_id: string | null
          notes: string | null
          photo_path: string | null
          primary_support_needs: string | null
          sex: string
          status: string
          updated_at: string
        }
        Insert: {
          age?: number | null
          care_home_id: string
          care_level: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          full_name: string
          id?: string
          legacy_local_id?: string | null
          notes?: string | null
          photo_path?: string | null
          primary_support_needs?: string | null
          sex?: string
          status?: string
          updated_at?: string
        }
        Update: {
          age?: number | null
          care_home_id?: string
          care_level?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          full_name?: string
          id?: string
          legacy_local_id?: string | null
          notes?: string | null
          photo_path?: string | null
          primary_support_needs?: string | null
          sex?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "residents_care_home_id_fkey"
            columns: ["care_home_id"]
            isOneToOne: false
            referencedRelation: "care_homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "residents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_reports: {
        Row: {
          care_home_id: string
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          notes: Json
          resident_id: string | null
          resident_name_snapshot: string
          shift_date: string
          shift_type: string
          summary: string
          updated_at: string
        }
        Insert: {
          care_home_id: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          notes: Json
          resident_id?: string | null
          resident_name_snapshot: string
          shift_date: string
          shift_type: string
          summary: string
          updated_at?: string
        }
        Update: {
          care_home_id?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          notes?: Json
          resident_id?: string | null
          resident_name_snapshot?: string
          shift_date?: string
          shift_type?: string
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_reports_care_home_id_fkey"
            columns: ["care_home_id"]
            isOneToOne: false
            referencedRelation: "care_homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_reports_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          care_home_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          due_at: string | null
          id: string
          priority: string
          resident_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          care_home_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: string
          resident_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          care_home_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: string
          resident_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_care_home_id_fkey"
            columns: ["care_home_id"]
            isOneToOne: false
            referencedRelation: "care_homes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_care_home_member: {
        Args: { p_care_home_id: string; p_email: string; p_role: string }
        Returns: string
      }
      create_care_home_onboarding: {
        Args: {
          care_home_name: string
          profile_email?: string
          profile_full_name?: string
        }
        Returns: string
      }
      get_care_home_staff: {
        Args: { p_care_home_id: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          membership_id: string
          role: string
          user_id: string
        }[]
      }
      get_my_care_home_ids: { Args: never; Returns: string[] }
      is_care_home_admin: { Args: { p_care_home_id: string }; Returns: boolean }
      remove_care_home_member: {
        Args: { p_membership_id: string }
        Returns: string
      }
      update_care_home_member_role: {
        Args: { p_membership_id: string; p_role: string }
        Returns: string
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
