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
      app_user_connections: {
        Row: {
          connection_key_ciphertext: string
          connector_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_key_ciphertext: string
          connector_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_key_ciphertext?: string
          connector_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          at: string
          changed_columns: string[] | null
          id: number
          row_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          at?: string
          changed_columns?: string[] | null
          id?: never
          row_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          at?: string
          changed_columns?: string[] | null
          id?: never
          row_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      push_deliveries: {
        Row: {
          id: number
          subscription_id: string
          event_key: string
          status: string
          created_at: string
          sent_at: string | null
        }
        Insert: {
          id?: never
          subscription_id: string
          event_key: string
          status?: string
          created_at?: string
          sent_at?: string | null
        }
        Update: {
          id?: never
          subscription_id?: string
          event_key?: string
          status?: string
          created_at?: string
          sent_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          enabled: boolean
          created_at: string
          updated_at: string
          last_success_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          enabled?: boolean
          created_at?: string
          updated_at?: string
          last_success_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          enabled?: boolean
          created_at?: string
          updated_at?: string
          last_success_at?: string | null
        }
        Relationships: []
      }
      capture_analyses: {
        Row: { capture_id: string; owner_id: string; summary: string; proposals: Json; status: string; model_name: string; analyzed_at: string; updated_at: string }
        Insert: { capture_id: string; owner_id: string; summary?: string; proposals?: Json; status?: string; model_name?: string; analyzed_at?: string; updated_at?: string }
        Update: { capture_id?: string; owner_id?: string; summary?: string; proposals?: Json; status?: string; model_name?: string; analyzed_at?: string; updated_at?: string }
        Relationships: []
      }
      capture_analysis_decisions: {
        Row: { capture_id: string; person_index: number; person_id: string; owner_id: string; reviewed_at: string }
        Insert: { capture_id: string; person_index: number; person_id: string; owner_id: string; reviewed_at?: string }
        Update: { capture_id?: string; person_index?: number; person_id?: string; owner_id?: string; reviewed_at?: string }
        Relationships: []
      }
      captures: {
        Row: {
          captured_at: string | null
          content_hash: string | null
          created_at: string
          error: string | null
          external_id: string | null
          id: string
          kind: string
          mime: string | null
          note: string | null
          owner_id: string
          project_id: string | null
          received_at: string
          size_bytes: number | null
          source: Database["public"]["Enums"]["source_kind"]
          source_message_id: string | null
          status: string
          storage_path: string | null
          title: string | null
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility"]
        }
        Insert: {
          captured_at?: string | null
          content_hash?: string | null
          created_at?: string
          error?: string | null
          external_id?: string | null
          id?: string
          kind: string
          mime?: string | null
          note?: string | null
          owner_id?: string
          project_id?: string | null
          received_at?: string
          size_bytes?: number | null
          source?: Database["public"]["Enums"]["source_kind"]
          source_message_id?: string | null
          status?: string
          storage_path?: string | null
          title?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Update: {
          captured_at?: string | null
          content_hash?: string | null
          created_at?: string
          error?: string | null
          external_id?: string | null
          id?: string
          kind?: string
          mime?: string | null
          note?: string | null
          owner_id?: string
          project_id?: string | null
          received_at?: string
          size_bytes?: number | null
          source?: Database["public"]["Enums"]["source_kind"]
          source_message_id?: string | null
          status?: string
          storage_path?: string | null
          title?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "captures_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "captures_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "sid_messages"
            referencedColumns: ["id"]
          },
        ]
      }
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
      facts: {
        Row: {
          author_id: string
          confidence: number | null
          created_at: string
          id: string
          is_inference: boolean
          kind: string
          person_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          source: Database["public"]["Enums"]["source_kind"]
          source_capture_id: string | null
          source_message_id: string | null
          status: Database["public"]["Enums"]["review_status"]
          text: string
          updated_at: string
        }
        Insert: {
          author_id?: string
          confidence?: number | null
          created_at?: string
          id?: string
          is_inference?: boolean
          kind: string
          person_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: Database["public"]["Enums"]["source_kind"]
          source_capture_id?: string | null
          source_message_id?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          text: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          confidence?: number | null
          created_at?: string
          id?: string
          is_inference?: boolean
          kind?: string
          person_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: Database["public"]["Enums"]["source_kind"]
          source_capture_id?: string | null
          source_message_id?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facts_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facts_source_capture_id_fkey"
            columns: ["source_capture_id"]
            isOneToOne: false
            referencedRelation: "captures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facts_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "sid_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      followups: {
        Row: {
          assignee_id: string | null
          created_at: string
          created_by: string
          done_at: string | null
          due_date: string | null
          id: string
          person_id: string
          reason: string | null
          result: string | null
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string
          done_at?: string | null
          due_date?: string | null
          id?: string
          person_id: string
          reason?: string | null
          result?: string | null
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string
          done_at?: string | null
          due_date?: string | null
          id?: string
          person_id?: string
          reason?: string | null
          result?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "followups_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      import_rows: {
        Row: {
          action: string | null
          created_at: string
          id: string
          import_id: string
          person_id: string | null
          raw: Json
          result: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string
          id?: string
          import_id: string
          person_id?: string | null
          raw: Json
          result?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string
          id?: string
          import_id?: string
          person_id?: string | null
          raw?: Json
          result?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_rows_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_rows_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      imports: {
        Row: {
          created_at: string
          file_name: string | null
          id: string
          owner_id: string
          row_count: number | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          id?: string
          owner_id?: string
          row_count?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          id?: string
          owner_id?: string
          row_count?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      interactions: {
        Row: {
          author_id: string
          confidence: number | null
          created_at: string
          id: string
          kind: string | null
          occurred_at: string | null
          person_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          source: Database["public"]["Enums"]["source_kind"]
          source_capture_id: string | null
          source_message_id: string | null
          status: Database["public"]["Enums"]["review_status"]
          summary: string | null
          updated_at: string
        }
        Insert: {
          author_id?: string
          confidence?: number | null
          created_at?: string
          id?: string
          kind?: string | null
          occurred_at?: string | null
          person_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: Database["public"]["Enums"]["source_kind"]
          source_capture_id?: string | null
          source_message_id?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          summary?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          confidence?: number | null
          created_at?: string
          id?: string
          kind?: string | null
          occurred_at?: string | null
          person_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: Database["public"]["Enums"]["source_kind"]
          source_capture_id?: string | null
          source_message_id?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_source_capture_id_fkey"
            columns: ["source_capture_id"]
            isOneToOne: false
            referencedRelation: "captures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "sid_messages"
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
      opportunities: {
        Row: {
          created_at: string
          decision: string | null
          id: string
          need: string | null
          owner_id: string
          project_id: string | null
          recommendation: string | null
          resources: string | null
          review_at: string | null
          scores: Json
          source: Database["public"]["Enums"]["source_kind"]
          source_capture_id: string | null
          status: string
          third_party: string | null
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility"]
        }
        Insert: {
          created_at?: string
          decision?: string | null
          id?: string
          need?: string | null
          owner_id?: string
          project_id?: string | null
          recommendation?: string | null
          resources?: string | null
          review_at?: string | null
          scores?: Json
          source?: Database["public"]["Enums"]["source_kind"]
          source_capture_id?: string | null
          status?: string
          third_party?: string | null
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Update: {
          created_at?: string
          decision?: string | null
          id?: string
          need?: string | null
          owner_id?: string
          project_id?: string | null
          recommendation?: string | null
          resources?: string | null
          review_at?: string | null
          scores?: Json
          source?: Database["public"]["Enums"]["source_kind"]
          source_capture_id?: string | null
          status?: string
          third_party?: string | null
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_source_capture_id_fkey"
            columns: ["source_capture_id"]
            isOneToOne: false
            referencedRelation: "captures"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_people: {
        Row: {
          opportunity_id: string
          person_id: string
        }
        Insert: {
          opportunity_id: string
          person_id: string
        }
        Update: {
          opportunity_id?: string
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_people_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_people_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
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
          context: string | null
          created_at: string
          id: string
          last_interaction_at: string | null
          name: string
          needs: string[]
          next_action: string | null
          next_followup_at: string | null
          owner_id: string
          priority: Database["public"]["Enums"]["priority"]
          project_id: string | null
          proximity: Database["public"]["Enums"]["proximity"]
          relationship_type: string | null
          role: string | null
          skills: string[]
          source: Database["public"]["Enums"]["source_kind"]
          sphere: string | null
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility"]
        }
        Insert: {
          aliases?: string[]
          city?: string | null
          company?: string | null
          context?: string | null
          created_at?: string
          id?: string
          last_interaction_at?: string | null
          name: string
          needs?: string[]
          next_action?: string | null
          next_followup_at?: string | null
          owner_id?: string
          priority?: Database["public"]["Enums"]["priority"]
          project_id?: string | null
          proximity?: Database["public"]["Enums"]["proximity"]
          relationship_type?: string | null
          role?: string | null
          skills?: string[]
          source?: Database["public"]["Enums"]["source_kind"]
          sphere?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Update: {
          aliases?: string[]
          city?: string | null
          company?: string | null
          context?: string | null
          created_at?: string
          id?: string
          last_interaction_at?: string | null
          name?: string
          needs?: string[]
          next_action?: string | null
          next_followup_at?: string | null
          owner_id?: string
          priority?: Database["public"]["Enums"]["priority"]
          project_id?: string | null
          proximity?: Database["public"]["Enums"]["proximity"]
          relationship_type?: string | null
          role?: string | null
          skills?: string[]
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
      processing_jobs: {
        Row: {
          attempts: number
          capture_id: string
          created_at: string
          id: string
          last_error: string | null
          status: string
          step: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          capture_id: string
          created_at?: string
          id?: string
          last_error?: string | null
          status?: string
          step: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          capture_id?: string
          created_at?: string
          id?: string
          last_error?: string | null
          status?: string
          step?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "processing_jobs_capture_id_fkey"
            columns: ["capture_id"]
            isOneToOne: false
            referencedRelation: "captures"
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
      tasks: {
        Row: {
          assignee_id: string | null
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          opportunity_id: string | null
          owner_id: string
          person_id: string | null
          priority: Database["public"]["Enums"]["priority"]
          project_id: string | null
          source: Database["public"]["Enums"]["source_kind"]
          source_message_id: string | null
          status: string
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility"]
        }
        Insert: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          opportunity_id?: string | null
          owner_id?: string
          person_id?: string | null
          priority?: Database["public"]["Enums"]["priority"]
          project_id?: string | null
          source?: Database["public"]["Enums"]["source_kind"]
          source_message_id?: string | null
          status?: string
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Update: {
          assignee_id?: string | null
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          opportunity_id?: string | null
          owner_id?: string
          person_id?: string | null
          priority?: Database["public"]["Enums"]["priority"]
          project_id?: string | null
          source?: Database["public"]["Enums"]["source_kind"]
          source_message_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "tasks_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_source_message_id_fkey"
            columns: ["source_message_id"]
            isOneToOne: false
            referencedRelation: "sid_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      transcripts: {
        Row: {
          capture_id: string
          created_at: string
          id: string
          language: string | null
          provider: string | null
          segments: Json | null
          status: Database["public"]["Enums"]["review_status"]
          text: string | null
          updated_at: string
        }
        Insert: {
          capture_id: string
          created_at?: string
          id?: string
          language?: string | null
          provider?: string | null
          segments?: Json | null
          status?: Database["public"]["Enums"]["review_status"]
          text?: string | null
          updated_at?: string
        }
        Update: {
          capture_id?: string
          created_at?: string
          id?: string
          language?: string | null
          provider?: string | null
          segments?: Json | null
          status?: Database["public"]["Enums"]["review_status"]
          text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcripts_capture_id_fkey"
            columns: ["capture_id"]
            isOneToOne: false
            referencedRelation: "captures"
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
