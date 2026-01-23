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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_document_requests: {
        Row: {
          created_at: string
          created_by: string
          generated_content: string | null
          hoa_id: string
          id: string
          input_context: Json
          request_type: string
        }
        Insert: {
          created_at?: string
          created_by: string
          generated_content?: string | null
          hoa_id: string
          id?: string
          input_context: Json
          request_type: string
        }
        Update: {
          created_at?: string
          created_by?: string
          generated_content?: string | null
          hoa_id?: string
          id?: string
          input_context?: Json
          request_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_document_requests_hoa_id_fkey"
            columns: ["hoa_id"]
            isOneToOne: false
            referencedRelation: "hoas"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_polls: {
        Row: {
          allow_multiple: boolean
          announcement_id: string
          created_at: string
          ends_at: string | null
          id: string
          options: Json
          question: string
        }
        Insert: {
          allow_multiple?: boolean
          announcement_id: string
          created_at?: string
          ends_at?: string | null
          id?: string
          options?: Json
          question: string
        }
        Update: {
          allow_multiple?: boolean
          announcement_id?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          options?: Json
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_polls_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_votes: {
        Row: {
          created_at: string
          id: string
          poll_id: string
          selected_options: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          poll_id: string
          selected_options?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          poll_id?: string
          selected_options?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "announcement_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          hoa_id: string
          id: string
          published_at: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          hoa_id: string
          id?: string
          published_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          hoa_id?: string
          id?: string
          published_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_hoa_id_fkey"
            columns: ["hoa_id"]
            isOneToOne: false
            referencedRelation: "hoas"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
        }
        Relationships: []
      }
      community_spaces: {
        Row: {
          capacity: number | null
          created_at: string
          description: string | null
          hoa_id: string
          id: string
          is_active: boolean
          location_notes: string | null
          name: string
          pricing_info: string | null
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          hoa_id: string
          id?: string
          is_active?: boolean
          location_notes?: string | null
          name: string
          pricing_info?: string | null
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          hoa_id?: string
          id?: string
          is_active?: boolean
          location_notes?: string | null
          name?: string
          pricing_info?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_spaces_hoa_id_fkey"
            columns: ["hoa_id"]
            isOneToOne: false
            referencedRelation: "hoas"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string
          description: string | null
          file_size: number | null
          file_type: string | null
          file_url: string
          hoa_id: string
          id: string
          name: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          category: string
          description?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          hoa_id: string
          id?: string
          name: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          description?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          hoa_id?: string
          id?: string
          name?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_hoa_id_fkey"
            columns: ["hoa_id"]
            isOneToOne: false
            referencedRelation: "hoas"
            referencedColumns: ["id"]
          },
        ]
      }
      hoa_fund_transfers: {
        Row: {
          amount: number
          created_at: string
          failure_reason: string | null
          hoa_id: string
          id: string
          net_amount: number
          payment_id: string | null
          payment_request_id: string | null
          payout_completed_at: string | null
          payout_initiated_at: string | null
          platform_fee: number | null
          received_at: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_payout_id: string | null
          stripe_transfer_id: string | null
          transferred_at: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          failure_reason?: string | null
          hoa_id: string
          id?: string
          net_amount: number
          payment_id?: string | null
          payment_request_id?: string | null
          payout_completed_at?: string | null
          payout_initiated_at?: string | null
          platform_fee?: number | null
          received_at?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_payout_id?: string | null
          stripe_transfer_id?: string | null
          transferred_at?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          failure_reason?: string | null
          hoa_id?: string
          id?: string
          net_amount?: number
          payment_id?: string | null
          payment_request_id?: string | null
          payout_completed_at?: string | null
          payout_initiated_at?: string | null
          platform_fee?: number | null
          received_at?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_payout_id?: string | null
          stripe_transfer_id?: string | null
          transferred_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hoa_fund_transfers_hoa_id_fkey"
            columns: ["hoa_id"]
            isOneToOne: false
            referencedRelation: "hoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hoa_fund_transfers_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hoa_fund_transfers_payment_request_id_fkey"
            columns: ["payment_request_id"]
            isOneToOne: false
            referencedRelation: "payment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      hoa_subscriptions: {
        Row: {
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          hoa_id: string
          id: string
          plan_name: string
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          hoa_id: string
          id?: string
          plan_name: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id: string
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          hoa_id?: string
          id?: string
          plan_name?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hoa_subscriptions_hoa_id_fkey"
            columns: ["hoa_id"]
            isOneToOne: true
            referencedRelation: "hoas"
            referencedColumns: ["id"]
          },
        ]
      }
      hoas: {
        Row: {
          address: string | null
          billing_email: string | null
          created_at: string
          id: string
          name: string
          settings: Json | null
          stripe_connect_id: string | null
          stripe_connect_onboarding_completed: boolean | null
          stripe_connect_payouts_enabled: boolean | null
          stripe_connect_status: string | null
          stripe_customer_id: string | null
          updated_at: string
          welcome_message: string | null
        }
        Insert: {
          address?: string | null
          billing_email?: string | null
          created_at?: string
          id?: string
          name: string
          settings?: Json | null
          stripe_connect_id?: string | null
          stripe_connect_onboarding_completed?: boolean | null
          stripe_connect_payouts_enabled?: boolean | null
          stripe_connect_status?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          welcome_message?: string | null
        }
        Update: {
          address?: string | null
          billing_email?: string | null
          created_at?: string
          id?: string
          name?: string
          settings?: Json | null
          stripe_connect_id?: string | null
          stripe_connect_onboarding_completed?: boolean | null
          stripe_connect_payouts_enabled?: boolean | null
          stripe_connect_status?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          welcome_message?: string | null
        }
        Relationships: []
      }
      join_requests: {
        Row: {
          city: string
          created_at: string
          hoa_id: string
          house_number: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          state: string
          status: string
          street_name: string
          updated_at: string
          user_id: string
          zip_code: string
        }
        Insert: {
          city: string
          created_at?: string
          hoa_id: string
          house_number: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          state: string
          status?: string
          street_name: string
          updated_at?: string
          user_id: string
          zip_code: string
        }
        Update: {
          city?: string
          created_at?: string
          hoa_id?: string
          house_number?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          state?: string
          status?: string
          street_name?: string
          updated_at?: string
          user_id?: string
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "join_requests_hoa_id_fkey"
            columns: ["hoa_id"]
            isOneToOne: false
            referencedRelation: "hoas"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_request_updates: {
        Row: {
          author_id: string
          created_at: string
          id: string
          is_internal: boolean
          message: string
          new_status: string | null
          old_status: string | null
          request_id: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          is_internal?: boolean
          message: string
          new_status?: string | null
          old_status?: string | null
          request_id: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          message?: string
          new_status?: string | null
          old_status?: string | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_request_updates_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "directory_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_request_updates_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_request_updates_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          assigned_to: string | null
          category: string
          closed_at: string | null
          created_at: string
          description: string
          hoa_id: string
          id: string
          location: string | null
          resident_id: string
          resolved_at: string | null
          status: string
          title: string
          updated_at: string
          urgency: string
        }
        Insert: {
          assigned_to?: string | null
          category: string
          closed_at?: string | null
          created_at?: string
          description: string
          hoa_id: string
          id?: string
          location?: string | null
          resident_id: string
          resolved_at?: string | null
          status?: string
          title: string
          updated_at?: string
          urgency?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          closed_at?: string | null
          created_at?: string
          description?: string
          hoa_id?: string
          id?: string
          location?: string | null
          resident_id?: string
          resolved_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "directory_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_hoa_id_fkey"
            columns: ["hoa_id"]
            isOneToOne: false
            referencedRelation: "hoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "directory_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_dismissals: {
        Row: {
          dismissed_at: string
          id: string
          notification_key: string
          user_id: string
        }
        Insert: {
          dismissed_at?: string
          id?: string
          notification_key: string
          user_id: string
        }
        Update: {
          dismissed_at?: string
          id?: string
          notification_key?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          delivered_at: string | null
          error_message: string | null
          hoa_id: string
          id: string
          notification_type: string
          recipient_email: string | null
          recipient_id: string | null
          recipient_phone: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          sent_at: string | null
          status: string
          subject: string | null
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          error_message?: string | null
          hoa_id: string
          id?: string
          notification_type: string
          recipient_email?: string | null
          recipient_id?: string | null
          recipient_phone?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          error_message?: string | null
          hoa_id?: string
          id?: string
          notification_type?: string
          recipient_email?: string | null
          recipient_id?: string | null
          recipient_phone?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_hoa_id_fkey"
            columns: ["hoa_id"]
            isOneToOne: false
            referencedRelation: "hoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "directory_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_requests: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          resident_id: string
          schedule_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          resident_id: string
          schedule_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          resident_id?: string
          schedule_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "payment_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_schedules: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          due_day: number | null
          frequency: string
          hoa_id: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          due_day?: number | null
          frequency: string
          hoa_id: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          due_day?: number | null
          frequency?: string
          hoa_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_schedules_hoa_id_fkey"
            columns: ["hoa_id"]
            isOneToOne: false
            referencedRelation: "hoas"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          id: string
          paid_at: string
          payment_method: string | null
          request_id: string | null
          resident_id: string
          stripe_transaction_id: string | null
        }
        Insert: {
          amount: number
          id?: string
          paid_at?: string
          payment_method?: string | null
          request_id?: string | null
          resident_id: string
          stripe_transaction_id?: string | null
        }
        Update: {
          amount?: number
          id?: string
          paid_at?: string
          payment_method?: string | null
          request_id?: string | null
          resident_id?: string
          stripe_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "payment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          email: string
          email_verification_code: string | null
          email_verification_expires_at: string | null
          email_verified: boolean | null
          hoa_id: string | null
          house_number: string | null
          id: string
          name: string
          notify_by_email: boolean | null
          notify_by_sms: boolean | null
          phone: string | null
          phone_verification_code: string | null
          phone_verification_expires_at: string | null
          phone_verified: boolean | null
          state: string | null
          status: string
          street_name: string | null
          unit_number: string | null
          updated_at: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          email: string
          email_verification_code?: string | null
          email_verification_expires_at?: string | null
          email_verified?: boolean | null
          hoa_id?: string | null
          house_number?: string | null
          id?: string
          name: string
          notify_by_email?: boolean | null
          notify_by_sms?: boolean | null
          phone?: string | null
          phone_verification_code?: string | null
          phone_verification_expires_at?: string | null
          phone_verified?: boolean | null
          state?: string | null
          status?: string
          street_name?: string | null
          unit_number?: string | null
          updated_at?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          email?: string
          email_verification_code?: string | null
          email_verification_expires_at?: string | null
          email_verified?: boolean | null
          hoa_id?: string | null
          house_number?: string | null
          id?: string
          name?: string
          notify_by_email?: boolean | null
          notify_by_sms?: boolean | null
          phone?: string | null
          phone_verification_code?: string | null
          phone_verification_expires_at?: string | null
          phone_verified?: boolean | null
          state?: string | null
          status?: string
          street_name?: string | null
          unit_number?: string | null
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_hoa_id_fkey"
            columns: ["hoa_id"]
            isOneToOne: false
            referencedRelation: "hoas"
            referencedColumns: ["id"]
          },
        ]
      }
      resident_invites: {
        Row: {
          city: string
          created_at: string
          created_by: string | null
          email: string | null
          expires_at: string
          hoa_id: string
          house_number: string
          id: string
          invite_token: string
          state: string
          street_name: string
          used_at: string | null
          used_by: string | null
          zip_code: string
        }
        Insert: {
          city: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string
          hoa_id: string
          house_number: string
          id?: string
          invite_token?: string
          state: string
          street_name: string
          used_at?: string | null
          used_by?: string | null
          zip_code: string
        }
        Update: {
          city?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          expires_at?: string
          hoa_id?: string
          house_number?: string
          id?: string
          invite_token?: string
          state?: string
          street_name?: string
          used_at?: string | null
          used_by?: string | null
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "resident_invites_hoa_id_fkey"
            columns: ["hoa_id"]
            isOneToOne: false
            referencedRelation: "hoas"
            referencedColumns: ["id"]
          },
        ]
      }
      space_availability_rules: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          space_id: string
          start_time: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          space_id: string
          start_time: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          space_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_availability_rules_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "community_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      space_blackout_dates: {
        Row: {
          blackout_date: string
          created_at: string
          id: string
          reason: string | null
          space_id: string
        }
        Insert: {
          blackout_date: string
          created_at?: string
          id?: string
          reason?: string | null
          space_id: string
        }
        Update: {
          blackout_date?: string
          created_at?: string
          id?: string
          reason?: string | null
          space_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_blackout_dates_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "community_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      space_reservations: {
        Row: {
          admin_notes: string | null
          created_at: string
          end_time: string
          id: string
          purpose: string | null
          reservation_date: string
          resident_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          space_id: string
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          end_time: string
          id?: string
          purpose?: string | null
          reservation_date: string
          resident_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          space_id: string
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          end_time?: string
          id?: string
          purpose?: string | null
          reservation_date?: string
          resident_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          space_id?: string
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_reservations_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "directory_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_reservations_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_reservations_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "directory_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_reservations_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_reservations_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "community_spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_attempts: {
        Row: {
          created_at: string | null
          failed_attempts: number | null
          id: string
          last_attempt: string | null
          locked_until: string | null
          user_id: string
          verification_type: string
        }
        Insert: {
          created_at?: string | null
          failed_attempts?: number | null
          id?: string
          last_attempt?: string | null
          locked_until?: string | null
          user_id: string
          verification_type: string
        }
        Update: {
          created_at?: string | null
          failed_attempts?: number | null
          id?: string
          last_attempt?: string | null
          locked_until?: string | null
          user_id?: string
          verification_type?: string
        }
        Relationships: []
      }
      violation_categories: {
        Row: {
          created_at: string
          default_fine_amount: number | null
          description: string | null
          hoa_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          default_fine_amount?: number | null
          description?: string | null
          hoa_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          default_fine_amount?: number | null
          description?: string | null
          hoa_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "violation_categories_hoa_id_fkey"
            columns: ["hoa_id"]
            isOneToOne: false
            referencedRelation: "hoas"
            referencedColumns: ["id"]
          },
        ]
      }
      violation_evidence: {
        Row: {
          description: string | null
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          uploaded_at: string
          uploaded_by: string
          violation_id: string
        }
        Insert: {
          description?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          uploaded_at?: string
          uploaded_by: string
          violation_id: string
        }
        Update: {
          description?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          uploaded_at?: string
          uploaded_by?: string
          violation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "violation_evidence_violation_id_fkey"
            columns: ["violation_id"]
            isOneToOne: false
            referencedRelation: "violations"
            referencedColumns: ["id"]
          },
        ]
      }
      violation_responses: {
        Row: {
          created_at: string
          id: string
          message: string | null
          resident_id: string
          response_type: string
          violation_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          resident_id: string
          response_type: string
          violation_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          resident_id?: string
          response_type?: string
          violation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "violation_responses_violation_id_fkey"
            columns: ["violation_id"]
            isOneToOne: false
            referencedRelation: "violations"
            referencedColumns: ["id"]
          },
        ]
      }
      violations: {
        Row: {
          acknowledged_at: string | null
          ai_disclaimer_shown: boolean | null
          ai_generated: boolean | null
          category_id: string | null
          created_at: string
          created_by: string
          description: string
          fine_amount: number | null
          fine_due_date: string | null
          hoa_id: string
          id: string
          location: string | null
          notice_content: string | null
          observed_at: string
          resident_id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          sent_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          ai_disclaimer_shown?: boolean | null
          ai_generated?: boolean | null
          category_id?: string | null
          created_at?: string
          created_by: string
          description: string
          fine_amount?: number | null
          fine_due_date?: string | null
          hoa_id: string
          id?: string
          location?: string | null
          notice_content?: string | null
          observed_at: string
          resident_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sent_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          ai_disclaimer_shown?: boolean | null
          ai_generated?: boolean | null
          category_id?: string | null
          created_at?: string
          created_by?: string
          description?: string
          fine_amount?: number | null
          fine_due_date?: string | null
          hoa_id?: string
          id?: string
          location?: string | null
          notice_content?: string | null
          observed_at?: string
          resident_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sent_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "violations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "violation_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "violations_hoa_id_fkey"
            columns: ["hoa_id"]
            isOneToOne: false
            referencedRelation: "hoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "violations_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "directory_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "violations_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      directory_profiles: {
        Row: {
          avatar_url: string | null
          hoa_id: string | null
          house_number: string | null
          id: string | null
          name: string | null
          status: string | null
          street_name: string | null
          unit_number: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          hoa_id?: string | null
          house_number?: string | null
          id?: string | null
          name?: string | null
          status?: string | null
          street_name?: string | null
          unit_number?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          hoa_id?: string | null
          house_number?: string | null
          id?: string | null
          name?: string | null
          status?: string | null
          street_name?: string | null
          unit_number?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_hoa_id_fkey"
            columns: ["hoa_id"]
            isOneToOne: false
            referencedRelation: "hoas"
            referencedColumns: ["id"]
          },
        ]
      }
      hoa_fund_summary: {
        Row: {
          completed_amount: number | null
          completed_count: number | null
          hoa_id: string | null
          in_transit_amount: number | null
          in_transit_count: number | null
          pending_amount: number | null
          pending_count: number | null
          total_platform_fees: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hoa_fund_transfers_hoa_id_fkey"
            columns: ["hoa_id"]
            isOneToOne: false
            referencedRelation: "hoas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_user_hoa_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "resident" | "super_admin"
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
      app_role: ["admin", "resident", "super_admin"],
    },
  },
} as const
