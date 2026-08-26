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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      exchange_listings: {
        Row: {
          buyer_id: string | null
          created_at: string
          fragment_id: string
          id: string
          price: number
          seller_id: string
          sold_at: string | null
          status: string
        }
        Insert: {
          buyer_id?: string | null
          created_at?: string
          fragment_id: string
          id?: string
          price: number
          seller_id: string
          sold_at?: string | null
          status?: string
        }
        Update: {
          buyer_id?: string | null
          created_at?: string
          fragment_id?: string
          id?: string
          price?: number
          seller_id?: string
          sold_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_listings_fragment_id_fkey"
            columns: ["fragment_id"]
            isOneToOne: false
            referencedRelation: "fragments"
            referencedColumns: ["id"]
          },
        ]
      }
      fragments: {
        Row: {
          banked: boolean
          created_at: string
          id: string
          image_data: string | null
          level: number
          prime_number: number
          user_id: string
        }
        Insert: {
          banked?: boolean
          created_at?: string
          id?: string
          image_data?: string | null
          level: number
          prime_number: number
          user_id: string
        }
        Update: {
          banked?: boolean
          created_at?: string
          id?: string
          image_data?: string | null
          level?: number
          prime_number?: number
          user_id?: string
        }
        Relationships: []
      }
      library: {
        Row: {
          id: string
          image_data: string | null
          level: number
          prime_number: number
          transferred_at: string
          user_id: string
        }
        Insert: {
          id?: string
          image_data?: string | null
          level: number
          prime_number: number
          transferred_at?: string
          user_id: string
        }
        Update: {
          id?: string
          image_data?: string | null
          level?: number
          prime_number?: number
          transferred_at?: string
          user_id?: string
        }
        Relationships: []
      }
      npc_book_entries: {
        Row: {
          bucket_key: string | null
          condition: Json | null
          created_at: string
          id: string
          npc_key: string
          options: Json
          page: number
          text: string
          updated_at: string
          weight: number
        }
        Insert: {
          bucket_key?: string | null
          condition?: Json | null
          created_at?: string
          id?: string
          npc_key: string
          options?: Json
          page?: number
          text: string
          updated_at?: string
          weight?: number
        }
        Update: {
          bucket_key?: string | null
          condition?: Json | null
          created_at?: string
          id?: string
          npc_key?: string
          options?: Json
          page?: number
          text?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      player_positions: {
        Row: {
          last_seen: string
          user_id: string
          village_level: number
          x: number
          y: number
        }
        Insert: {
          last_seen?: string
          user_id: string
          village_level?: number
          x?: number
          y?: number
        }
        Update: {
          last_seen?: string
          user_id?: string
          village_level?: number
          x?: number
          y?: number
        }
        Relationships: []
      }
      quest_flags: {
        Row: {
          flag_key: string
          flag_value: string
          updated_at: string
          user_id: string
        }
        Insert: {
          flag_key: string
          flag_value: string
          updated_at?: string
          user_id: string
        }
        Update: {
          flag_key?: string
          flag_value?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_flags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          aura_color: string | null
          created_at: string
          credits: number
          entity_answer: string | null
          first_launch_at: string
          growth_points: number
          id: string
          level: number
          levelup_newlevel: number | null
          levelup_pending: boolean
          maze_completed_level: number
          perception: number
          registration_number: number
          social: number
          steps_remaining: number
          subscription_status: string
          subscription_tier: string | null
          title: string
          total_maze_steps: number
          total_maze_time: number
          trade: number
          trial_end: string
          unlocked_titles: string[]
          updated_at: string
          username: string | null
        }
        Insert: {
          aura_color?: string | null
          created_at?: string
          credits?: number
          entity_answer?: string | null
          first_launch_at?: string
          growth_points?: number
          id: string
          level?: number
          levelup_newlevel?: number | null
          levelup_pending?: boolean
          maze_completed_level?: number
          perception?: number
          registration_number?: number
          social?: number
          steps_remaining?: number
          subscription_status?: string
          subscription_tier?: string | null
          title?: string
          total_maze_steps?: number
          total_maze_time?: number
          trade?: number
          trial_end?: string
          unlocked_titles?: string[]
          updated_at?: string
          username?: string | null
        }
        Update: {
          aura_color?: string | null
          created_at?: string
          credits?: number
          entity_answer?: string | null
          first_launch_at?: string
          growth_points?: number
          id?: string
          level?: number
          levelup_newlevel?: number | null
          levelup_pending?: boolean
          maze_completed_level?: number
          perception?: number
          registration_number?: number
          social?: number
          steps_remaining?: number
          subscription_status?: string
          subscription_tier?: string | null
          title?: string
          total_maze_steps?: number
          total_maze_time?: number
          trade?: number
          trial_end?: string
          unlocked_titles?: string[]
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      purchase_fragment_listing: {
        Args: { p_buyer_id: string; p_listing_id: string }
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
  public: {
    Enums: {},
  },
} as const
