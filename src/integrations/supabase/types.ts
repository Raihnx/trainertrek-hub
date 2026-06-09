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
      admin_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string
          actor_name: string | null
          actor_role: string | null
          created_at: string
          description: string | null
          id: string
          metadata: Json
          target_id: string | null
          target_label: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id: string
          actor_name?: string | null
          actor_role?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string
          actor_name?: string | null
          actor_role?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      attendance: {
        Row: {
          client_id: string
          created_at: string
          date: string
          id: string
          status: string
          trainer_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          date: string
          id?: string
          status: string
          trainer_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          date?: string
          id?: string
          status?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          amount_paid: number
          client_type: Database["public"]["Enums"]["client_type"]
          created_at: string
          eligible_days: number
          expiry_date: string
          freeze_days: number
          id: string
          joining_date: string
          name: string
          package_amount: number
          package_id: string | null
          package_name: string | null
          phone: string | null
          photo_url: string | null
          preferred_hour: number | null
          total_days: number
          trainer_id: string
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          client_type?: Database["public"]["Enums"]["client_type"]
          created_at?: string
          eligible_days?: number
          expiry_date: string
          freeze_days?: number
          id?: string
          joining_date?: string
          name: string
          package_amount?: number
          package_id?: string | null
          package_name?: string | null
          phone?: string | null
          photo_url?: string | null
          preferred_hour?: number | null
          total_days?: number
          trainer_id: string
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          client_type?: Database["public"]["Enums"]["client_type"]
          created_at?: string
          eligible_days?: number
          expiry_date?: string
          freeze_days?: number
          id?: string
          joining_date?: string
          name?: string
          package_amount?: number
          package_id?: string | null
          package_name?: string | null
          phone?: string | null
          photo_url?: string | null
          preferred_hour?: number | null
          total_days?: number
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          trainer_id: string
          type: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          trainer_id: string
          type: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          trainer_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          created_at: string
          duration_days: number
          id: string
          name: string
          price: number
          trainer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_days: number
          id?: string
          name: string
          price?: number
          trainer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_days?: number
          id?: string
          name?: string
          price?: number
          trainer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          id: string
          note: string | null
          paid_at: string
          trainer_id: string
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          id?: string
          note?: string | null
          paid_at?: string
          trainer_id: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          id?: string
          note?: string | null
          paid_at?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string
          created_at: string
          description: string | null
          key: string
          label: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          key: string
          label: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          key?: string
          label?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          certifications: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          level: string | null
          phone: string | null
          specialization: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          certifications?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          level?: string | null
          phone?: string | null
          specialization?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          certifications?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          level?: string | null
          phone?: string | null
          specialization?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          permission_key?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
        ]
      }
      user_permissions: {
        Row: {
          granted: boolean
          permission_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          granted: boolean
          permission_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          granted?: boolean
          permission_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_permission: {
        Args: { _key: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_assignable_trainers: {
        Args: never
        Returns: {
          display_name: string
          email: string
          id: string
          role: string
        }[]
      }
      log_audit_event: {
        Args: {
          _action: string
          _description?: string
          _metadata?: Json
          _target_id?: string
          _target_label?: string
          _target_type?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "receptionist" | "trainer"
      client_type: "GT" | "PT"
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
      app_role: ["admin", "receptionist", "trainer"],
      client_type: ["GT", "PT"],
    },
  },
} as const
