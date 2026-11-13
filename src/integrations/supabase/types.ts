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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      manager_emails: {
        Row: {
          email: string
        }
        Insert: {
          email: string
        }
        Update: {
          email?: string
        }
        Relationships: []
      }
      member_connections: {
        Row: {
          closed_at: string | null
          last_seen_at: string
          member_id: string
          session_id: string
          token_hash: string
        }
        Insert: {
          closed_at?: string | null
          last_seen_at?: string
          member_id: string
          session_id: string
          token_hash: string
        }
        Update: {
          closed_at?: string | null
          last_seen_at?: string
          member_id?: string
          session_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_connections_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          created_at: string
          display_name: string
          id: string
          manager_set_at: string | null
          note: string | null
          status: Database["public"]["Enums"]["presence_status"]
          status_updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          manager_set_at?: string | null
          note?: string | null
          status?: Database["public"]["Enums"]["presence_status"]
          status_updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          manager_set_at?: string | null
          note?: string | null
          status?: Database["public"]["Enums"]["presence_status"]
          status_updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          status: Database["public"]["Enums"]["presence_status"]
          status_updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
          status?: Database["public"]["Enums"]["presence_status"]
          status_updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          status?: Database["public"]["Enums"]["presence_status"]
          status_updated_at?: string
        }
        Relationships: []
      }
      status_events: {
        Row: {
          id: number
          member_id: string
          started_at: string
          status: Database["public"]["Enums"]["presence_status"]
        }
        Insert: {
          id?: number
          member_id: string
          started_at?: string
          status: Database["public"]["Enums"]["presence_status"]
        }
        Update: {
          id?: number
          member_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["presence_status"]
        }
        Relationships: [
          {
            foreignKeyName: "status_events_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          role: string
          user_id: string
        }
        Update: {
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      close_member: {
        Args: { p_session: string; p_token: string }
        Returns: undefined
      }
      connect_member: {
        Args: {
          p_member?: string
          p_name?: string
          p_session?: string
          p_token?: string
        }
        Returns: string
      }
      connect_member_legacy: {
        Args: {
          p_member: string
          p_name: string
          p_session: string
          p_token: string
        }
        Returns: string
      }
      heartbeat_member: {
        Args: { p_session: string; p_token: string }
        Returns: undefined
      }
      is_manager: { Args: never; Returns: boolean }
      list_member_presence: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          id: string
          manager_set_at: string | null
          note: string | null
          status: Database["public"]["Enums"]["presence_status"]
          status_updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "members"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      manager_day_history: {
        Args: never
        Returns: {
          member_id: string
          seconds: number
          status: Database["public"]["Enums"]["presence_status"]
        }[]
      }
      manager_delete_member: { Args: { p_member: string }; Returns: undefined }
      manager_set_status: {
        Args: {
          p_member: string
          p_status: Database["public"]["Enums"]["presence_status"]
        }
        Returns: undefined
      }
      set_member_note: {
        Args: { p_note: string; p_session: string; p_token: string }
        Returns: undefined
      }
      set_member_status: {
        Args: {
          p_session: string
          p_status: Database["public"]["Enums"]["presence_status"]
          p_token: string
        }
        Returns: undefined
      }
    }
    Enums: {
      presence_status:
        | "online"
        | "offline"
        | "away"
        | "lunch"
        | "meeting"
        | "vacation"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      presence_status: [
        "online",
        "offline",
        "away",
        "lunch",
        "meeting",
        "vacation",
      ],
    },
  },
} as const
