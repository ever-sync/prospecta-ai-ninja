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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      api_usage_logs: {
        Row: {
          cost_estimate_cents: number | null
          created_at: string
          id: string
          metadata: Json | null
          operation: string
          service: string
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          cost_estimate_cents?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          operation: string
          service: string
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          cost_estimate_cents?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          operation?: string
          service?: string
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: []
      }
      campaign_presentations: {
        Row: {
          campaign_id: string
          created_at: string | null
          id: string
          presentation_id: string
          send_status: string | null
          sent_at: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          id?: string
          presentation_id: string
          send_status?: string | null
          sent_at?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          id?: string
          presentation_id?: string
          send_status?: string | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_presentations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_presentations_presentation_id_fkey"
            columns: ["presentation_id"]
            isOneToOne: false
            referencedRelation: "presentations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          channel: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          scheduled_at: string | null
          sent_at: string | null
          status: string
          template_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          channel?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      client_logos: {
        Row: {
          company_name: string
          created_at: string | null
          id: string
          logo_url: string
          user_id: string
        }
        Insert: {
          company_name?: string
          created_at?: string | null
          id?: string
          logo_url: string
          user_id: string
        }
        Update: {
          company_name?: string
          created_at?: string | null
          id?: string
          logo_url?: string
          user_id?: string
        }
        Relationships: []
      }
      company_dna: {
        Row: {
          additional_info: string | null
          created_at: string | null
          differentials: string[] | null
          facebook_url: string | null
          id: string
          instagram_url: string | null
          linkedin_url: string | null
          portfolio_url: string | null
          presentation_instructions: string | null
          presentation_template: string | null
          presentation_tone: string | null
          services: string[] | null
          target_audience: string | null
          tone: string | null
          updated_at: string | null
          user_id: string
          value_proposition: string | null
          youtube_url: string | null
        }
        Insert: {
          additional_info?: string | null
          created_at?: string | null
          differentials?: string[] | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          portfolio_url?: string | null
          presentation_instructions?: string | null
          presentation_template?: string | null
          presentation_tone?: string | null
          services?: string[] | null
          target_audience?: string | null
          tone?: string | null
          updated_at?: string | null
          user_id: string
          value_proposition?: string | null
          youtube_url?: string | null
        }
        Update: {
          additional_info?: string | null
          created_at?: string | null
          differentials?: string[] | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          portfolio_url?: string | null
          presentation_instructions?: string | null
          presentation_template?: string | null
          presentation_tone?: string | null
          services?: string[] | null
          target_audience?: string | null
          tone?: string | null
          updated_at?: string | null
          user_id?: string
          value_proposition?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      lead_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          presentation_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          presentation_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          presentation_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_presentation_id_fkey"
            columns: ["presentation_id"]
            isOneToOne: false
            referencedRelation: "presentations"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body: string
          channel: string
          created_at: string | null
          id: string
          image_url: string | null
          include_proposal_link: boolean | null
          name: string
          subject: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          body?: string
          channel?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          include_proposal_link?: boolean | null
          name?: string
          subject?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          include_proposal_link?: boolean | null
          name?: string
          subject?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pipeline_stages: {
        Row: {
          color: string
          created_at: string | null
          default_status: string | null
          id: string
          is_default: boolean
          name: string
          position: number
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          default_status?: string | null
          id?: string
          is_default?: boolean
          name: string
          position?: number
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string | null
          default_status?: string | null
          id?: string
          is_default?: boolean
          name?: string
          position?: number
          user_id?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string | null
          display_order: number
          features: string[]
          id: string
          is_active: boolean
          limit_campaigns: number
          limit_emails: number
          limit_presentations: number
          name: string
          price_cents: number
          stripe_price_id: string | null
          stripe_product_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number
          features?: string[]
          id: string
          is_active?: boolean
          limit_campaigns?: number
          limit_emails?: number
          limit_presentations?: number
          name: string
          price_cents?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number
          features?: string[]
          id?: string
          is_active?: boolean
          limit_campaigns?: number
          limit_emails?: number
          limit_presentations?: number
          name?: string
          price_cents?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      presentation_views: {
        Row: {
          id: string
          presentation_id: string
          viewed_at: string
          viewer_ip: string | null
        }
        Insert: {
          id?: string
          presentation_id: string
          viewed_at?: string
          viewer_ip?: string | null
        }
        Update: {
          id?: string
          presentation_id?: string
          viewed_at?: string
          viewer_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "presentation_views_presentation_id_fkey"
            columns: ["presentation_id"]
            isOneToOne: false
            referencedRelation: "presentations"
            referencedColumns: ["id"]
          },
        ]
      }
      presentations: {
        Row: {
          analysis_data: Json | null
          business_address: string | null
          business_category: string | null
          business_name: string | null
          business_phone: string | null
          business_rating: number | null
          business_website: string | null
          created_at: string | null
          id: string
          lead_response: string | null
          pipeline_stage_id: string | null
          presentation_html: string | null
          public_id: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          analysis_data?: Json | null
          business_address?: string | null
          business_category?: string | null
          business_name?: string | null
          business_phone?: string | null
          business_rating?: number | null
          business_website?: string | null
          created_at?: string | null
          id?: string
          lead_response?: string | null
          pipeline_stage_id?: string | null
          presentation_html?: string | null
          public_id?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          analysis_data?: Json | null
          business_address?: string | null
          business_category?: string | null
          business_name?: string | null
          business_phone?: string | null
          business_rating?: number | null
          business_website?: string | null
          created_at?: string | null
          id?: string
          lead_response?: string | null
          pipeline_stage_id?: string | null
          presentation_html?: string | null
          public_id?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "presentations_pipeline_stage_id_fkey"
            columns: ["pipeline_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_logo_url: string | null
          company_name: string | null
          created_at: string | null
          email: string | null
          id: string
          phone: string | null
          user_id: string
        }
        Insert: {
          company_logo_url?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          user_id: string
        }
        Update: {
          company_logo_url?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          company: string
          created_at: string | null
          id: string
          image_url: string | null
          name: string
          testimonial: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          name?: string
          testimonial?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          name?: string
          testimonial?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
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
