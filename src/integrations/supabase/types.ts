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
      contact_methods: {
        Row: {
          created_at: string
          id: string
          kind: string
          person_id: string
          updated_at: string
          value_normalized: string | null
          value_raw: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          person_id: string
          updated_at?: string
          value_normalized?: string | null
          value_raw: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          person_id?: string
          updated_at?: string
          value_normalized?: string | null
          value_raw?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_methods_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          content_hash: string | null
          created_at: string
          id: string
          kind: string
          message_id: string
          mime: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          content_hash?: string | null
          created_at?: string
          id?: string
          kind: string
          message_id: string
          mime?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string
        }
        Update: {
          content_hash?: string | null
          created_at?: string
          id?: string
          kind?: string
          message_id?: string
          mime?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "sid_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          aliases: string[]
          city: string | null
          company: string | null
          created_at: string
          id: string
          last_interaction_at: string | null
          name: string
          next_followup_at: string | null
          owner_id: string
          priority: Database["public"]["Enums"]["priority"]
          project_id: string | null
          proximity: Database["public"]["Enums"]["proximity"]
          role: string | null
          source: Database["public"]["Enums"]["source_kind"]
          sphere: string | null
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility"]
        }
        Insert: {
          aliases?: string[]
          city?: string | null
          company?: string | null
          created_at?: string
          id?: string
          last_interaction_at?: string | null
          name: string
          next_followup_at?: string | null
          owner_id?: string
          priority?: Database["public"]["Enums"]["priority"]
          project_id?: string | null
          proximity?: Database["public"]["Enums"]["proximity"]
          role?: string | null
          source?: Database["public"]["Enums"]["source_kind"]
          sphere?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Update: {
          aliases?: string[]
          city?: string | null
          company?: string | null
          created_at?: string
          id?: string
          last_interaction_at?: string | null
          name?: string
          next_followup_at?: string | null
          owner_id?: string
          priority?: Database["public"]["Enums"]["priority"]
          project_id?: string | null
          proximity?: Database["public"]["Enums"]["proximity"]
          role?: string | null
          source?: Database["public"]["Enums"]["source_kind"]
          sphere?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "people_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      people_organizations: {
        Row: {
          created_at: string
          organization_id: string
          person_id: string
          role: string | null
        }
        Insert: {
          created_at?: string
          organization_id: string
          person_id: string
          role?: string | null
        }
        Update: {
          created_at?: string
          organization_id?: string
          person_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_organizations_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          added_by: string | null
          created_at: string
          project_id: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          project_id: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          goal: string | null
          id: string
          name: string
          owner_id: string
          progress: number
          project_id: string | null
          risk: string | null
          status: string
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility"]
        }
        Insert: {
          created_at?: string
          goal?: string | null
          id?: string
          name: string
          owner_id?: string
          progress?: number
          project_id?: string | null
          risk?: string | null
          status?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Update: {
          created_at?: string
          goal?: string | null
          id?: string
          name?: string
          owner_id?: string
          progress?: number
          project_id?: string | null
          risk?: string | null
          status?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Relationships: []
      }
      relationships: {
        Row: {
          a: string
          b: string
          created_at: string
          created_by: string
          evidence: string | null
          id: string
          kind: string | null
          status: Database["public"]["Enums"]["review_status"]
          updated_at: string
        }
        Insert: {
          a: string
          b: string
          created_at?: string
          created_by?: string
          evidence?: string | null
          id?: string
          kind?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
        }
        Update: {
          a?: string
          b?: string
          created_at?: string
          created_by?: string
          evidence?: string | null
          id?: string
          kind?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationships_a_fkey"
            columns: ["a"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_b_fkey"
            columns: ["b"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      sid_conversations: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          project_id: string | null
          title: string | null
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility"]
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id?: string
          project_id?: string | null
          title?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          project_id?: string | null
          title?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "sid_conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sid_messages: {
        Row: {
          author_id: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          mode: string | null
          role: string
          status: string
        }
        Insert: {
          author_id?: string | null
          content?: string
          conversation_id: string
          created_at?: string
          id?: string
          mode?: string | null
          role: string
          status?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          mode?: string | null
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sid_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "sid_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
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
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "gestor" | "operacional"
      priority: "alta" | "media" | "baixa"
      proximity:
        | "multidao"
        | "seguidor"
        | "discipulo"
        | "amigo_proximo"
        | "amigo_intimo"
      review_status: "extraido" | "sugerido" | "aprovado" | "rejeitado"
      source_kind:
        | "manual"
        | "captura"
        | "sid"
        | "importacao"
        | "plaud"
        | "integracao"
      visibility: "privado" | "equipe" | "projeto"
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
      app_role: ["admin", "gestor", "operacional"],
      priority: ["alta", "media", "baixa"],
      proximity: [
        "multidao",
        "seguidor",
        "discipulo",
        "amigo_proximo",
        "amigo_intimo",
      ],
      review_status: ["extraido", "sugerido", "aprovado", "rejeitado"],
      source_kind: [
        "manual",
        "captura",
        "sid",
        "importacao",
        "plaud",
        "integracao",
      ],
      visibility: ["privado", "equipe", "projeto"],
    },
  },
} as const
