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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accessories: {
        Row: {
          available_quantity: number
          created_at: string
          description: string | null
          display_serial: string | null
          id: string
          image_url: string | null
          internal_details: Json | null
          internal_tracking_id: string | null
          is_active: boolean
          model_number: string | null
          name: string
          price_per_day: number
          security_deposit: number
          serial_number: string | null
          total_quantity: number
          updated_at: string
          user_manual_url: string | null
        }
        Insert: {
          available_quantity?: number
          created_at?: string
          description?: string | null
          display_serial?: string | null
          id?: string
          image_url?: string | null
          internal_details?: Json | null
          internal_tracking_id?: string | null
          is_active?: boolean
          model_number?: string | null
          name: string
          price_per_day: number
          security_deposit?: number
          serial_number?: string | null
          total_quantity?: number
          updated_at?: string
          user_manual_url?: string | null
        }
        Update: {
          available_quantity?: number
          created_at?: string
          description?: string | null
          display_serial?: string | null
          id?: string
          image_url?: string | null
          internal_details?: Json | null
          internal_tracking_id?: string | null
          is_active?: boolean
          model_number?: string | null
          name?: string
          price_per_day?: number
          security_deposit?: number
          serial_number?: string | null
          total_quantity?: number
          updated_at?: string
          user_manual_url?: string | null
        }
        Relationships: []
      }
      booking_accessories: {
        Row: {
          accessory_id: string
          booking_id: string
          created_at: string
          days: number
          id: string
          price_per_day: number
          quantity: number
          total_cost: number
        }
        Insert: {
          accessory_id: string
          booking_id: string
          created_at?: string
          days: number
          id?: string
          price_per_day: number
          quantity?: number
          total_cost: number
        }
        Update: {
          accessory_id?: string
          booking_id?: string
          created_at?: string
          days?: number
          id?: string
          price_per_day?: number
          quantity?: number
          total_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_accessories_accessory_id_fkey"
            columns: ["accessory_id"]
            isOneToOne: false
            referencedRelation: "accessories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_accessories_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_extensions: {
        Row: {
          additional_cost: number
          approved_at: string | null
          approved_by: string | null
          booking_id: string
          created_at: string
          id: string
          rejection_reason: string | null
          requested_at: string
          requested_return_date: string
          status: string
          updated_at: string
        }
        Insert: {
          additional_cost: number
          approved_at?: string | null
          approved_by?: string | null
          booking_id: string
          created_at?: string
          id?: string
          rejection_reason?: string | null
          requested_at?: string
          requested_return_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          additional_cost?: number
          approved_at?: string | null
          approved_by?: string | null
          booking_id?: string
          created_at?: string
          id?: string
          rejection_reason?: string | null
          requested_at?: string
          requested_return_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_extensions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          accessories_cost: number
          booking_id: string
          booking_status: string
          cancellation_fee: number | null
          cancellation_reason: string | null
          cancellation_requested_at: string | null
          cancellation_status: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          coupon_code: string | null
          coupon_id: string | null
          created_at: string
          cycle_condition: string | null
          cycle_id: string
          cycle_inspected_at: string | null
          cycle_rental_cost: number
          cycle_returned_at: string | null
          deposit_refund_amount: number | null
          deposit_returned_at: string | null
          discount_amount: number | null
          duration_type: string
          extension_additional_cost: number | null
          extension_approved_at: string | null
          extension_requested_at: string | null
          extension_return_date: string | null
          gst: number
          has_insurance: boolean
          id: string
          insurance_cost: number
          late_fee: number | null
          notes: string | null
          partner_id: string | null
          payment_id: string | null
          payment_method: string | null
          payment_status: string
          pickup_date: string
          pickup_location_id: string | null
          pickup_time: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          refund_amount: number | null
          return_date: string
          return_photos: string[] | null
          return_time: string | null
          security_deposit: number
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          accessories_cost?: number
          booking_id: string
          booking_status?: string
          cancellation_fee?: number | null
          cancellation_reason?: string | null
          cancellation_requested_at?: string | null
          cancellation_status?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          cycle_condition?: string | null
          cycle_id: string
          cycle_inspected_at?: string | null
          cycle_rental_cost: number
          cycle_returned_at?: string | null
          deposit_refund_amount?: number | null
          deposit_returned_at?: string | null
          discount_amount?: number | null
          duration_type: string
          extension_additional_cost?: number | null
          extension_approved_at?: string | null
          extension_requested_at?: string | null
          extension_return_date?: string | null
          gst: number
          has_insurance?: boolean
          id?: string
          insurance_cost?: number
          late_fee?: number | null
          notes?: string | null
          partner_id?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string
          pickup_date: string
          pickup_location_id?: string | null
          pickup_time: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          refund_amount?: number | null
          return_date: string
          return_photos?: string[] | null
          return_time?: string | null
          security_deposit: number
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          accessories_cost?: number
          booking_id?: string
          booking_status?: string
          cancellation_fee?: number | null
          cancellation_reason?: string | null
          cancellation_requested_at?: string | null
          cancellation_status?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          coupon_code?: string | null
          coupon_id?: string | null
          created_at?: string
          cycle_condition?: string | null
          cycle_id?: string
          cycle_inspected_at?: string | null
          cycle_rental_cost?: number
          cycle_returned_at?: string | null
          deposit_refund_amount?: number | null
          deposit_returned_at?: string | null
          discount_amount?: number | null
          duration_type?: string
          extension_additional_cost?: number | null
          extension_approved_at?: string | null
          extension_requested_at?: string | null
          extension_return_date?: string | null
          gst?: number
          has_insurance?: boolean
          id?: string
          insurance_cost?: number
          late_fee?: number | null
          notes?: string | null
          partner_id?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string
          pickup_date?: string
          pickup_location_id?: string | null
          pickup_time?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          refund_amount?: number | null
          return_date?: string
          return_photos?: string[] | null
          return_time?: string | null
          security_deposit?: number
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_pickup_location_id_fkey"
            columns: ["pickup_location_id"]
            isOneToOne: false
            referencedRelation: "pickup_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "fk_bookings_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      coupon_usage: {
        Row: {
          booking_id: string
          coupon_id: string
          discount_amount: number
          id: string
          used_at: string
          user_id: string
        }
        Insert: {
          booking_id: string
          coupon_id: string
          discount_amount: number
          id?: string
          used_at?: string
          user_id: string
        }
        Update: {
          booking_id?: string
          coupon_id?: string
          discount_amount?: number
          id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_uses: number | null
          min_order_amount: number | null
          updated_at: string
          used_count: number
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          updated_at?: string
          used_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_order_amount?: number | null
          updated_at?: string
          used_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      cycle_maintenance: {
        Row: {
          completed_at: string | null
          cost: number | null
          created_at: string
          cycle_id: string
          description: string | null
          id: string
          maintenance_type: string
          performed_by: string | null
          reported_at: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          cost?: number | null
          created_at?: string
          cycle_id: string
          description?: string | null
          id?: string
          maintenance_type: string
          performed_by?: string | null
          reported_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          cost?: number | null
          created_at?: string
          cycle_id?: string
          description?: string | null
          id?: string
          maintenance_type?: string
          performed_by?: string | null
          reported_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycle_maintenance_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      cycles: {
        Row: {
          created_at: string
          description: string | null
          display_serial: string | null
          free_accessories: string[] | null
          id: string
          image_url: string | null
          internal_details: Json | null
          internal_tracking_id: string | null
          is_active: boolean
          media_urls: string[] | null
          model: string
          model_number: string | null
          name: string
          price_per_day: number
          price_per_hour: number
          price_per_month: number | null
          price_per_week: number
          price_per_year: number | null
          quantity: number
          security_deposit: number
          security_deposit_day: number
          security_deposit_month: number
          security_deposit_week: number
          serial_number: string | null
          specifications: string | null
          updated_at: string
          user_manual_url: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_serial?: string | null
          free_accessories?: string[] | null
          id?: string
          image_url?: string | null
          internal_details?: Json | null
          internal_tracking_id?: string | null
          is_active?: boolean
          media_urls?: string[] | null
          model: string
          model_number?: string | null
          name: string
          price_per_day: number
          price_per_hour: number
          price_per_month?: number | null
          price_per_week: number
          price_per_year?: number | null
          quantity?: number
          security_deposit?: number
          security_deposit_day?: number
          security_deposit_month?: number
          security_deposit_week?: number
          serial_number?: string | null
          specifications?: string | null
          updated_at?: string
          user_manual_url?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_serial?: string | null
          free_accessories?: string[] | null
          id?: string
          image_url?: string | null
          internal_details?: Json | null
          internal_tracking_id?: string | null
          is_active?: boolean
          media_urls?: string[] | null
          model?: string
          model_number?: string | null
          name?: string
          price_per_day?: number
          price_per_hour?: number
          price_per_month?: number | null
          price_per_week?: number
          price_per_year?: number | null
          quantity?: number
          security_deposit?: number
          security_deposit_day?: number
          security_deposit_month?: number
          security_deposit_week?: number
          serial_number?: string | null
          specifications?: string | null
          updated_at?: string
          user_manual_url?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      damage_reports: {
        Row: {
          additional_charge_paid: boolean | null
          booking_id: string
          created_at: string
          created_by: string | null
          cycle_id: string
          damage_cost: number
          damage_description: string
          deducted_from_deposit: boolean | null
          id: string
          photo_urls: string[] | null
          reported_at: string
          updated_at: string
        }
        Insert: {
          additional_charge_paid?: boolean | null
          booking_id: string
          created_at?: string
          created_by?: string | null
          cycle_id: string
          damage_cost?: number
          damage_description: string
          deducted_from_deposit?: boolean | null
          id?: string
          photo_urls?: string[] | null
          reported_at?: string
          updated_at?: string
        }
        Update: {
          additional_charge_paid?: boolean | null
          booking_id?: string
          created_at?: string
          created_by?: string | null
          cycle_id?: string
          damage_cost?: number
          damage_description?: string
          deducted_from_deposit?: boolean | null
          id?: string
          photo_urls?: string[] | null
          reported_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "damage_reports_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "damage_reports_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          booking_id: string | null
          created_at: string
          email_sent: boolean | null
          id: string
          message: string
          read_at: string | null
          sent_at: string | null
          sms_sent: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          email_sent?: boolean | null
          id?: string
          message: string
          read_at?: string | null
          sent_at?: string | null
          sms_sent?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          email_sent?: boolean | null
          id?: string
          message?: string
          read_at?: string | null
          sent_at?: string | null
          sms_sent?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          address: string
          city: string
          created_at: string
          email: string | null
          google_maps_link: string | null
          id: string
          is_active: boolean
          landmark: string | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          partner_code: string | null
          partner_type: string
          phone_number: string
          pincode: string
          state: string
          updated_at: string
        }
        Insert: {
          address: string
          city: string
          created_at?: string
          email?: string | null
          google_maps_link?: string | null
          id?: string
          is_active?: boolean
          landmark?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          partner_code?: string | null
          partner_type?: string
          phone_number: string
          pincode: string
          state: string
          updated_at?: string
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          email?: string | null
          google_maps_link?: string | null
          id?: string
          is_active?: boolean
          landmark?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          partner_code?: string | null
          partner_type?: string
          phone_number?: string
          pincode?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      phone_otps: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          otp_code: string
          phone_number: string
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          otp_code: string
          phone_number: string
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          otp_code?: string
          phone_number?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      pickup_locations: {
        Row: {
          address: string
          city: string
          created_at: string
          google_maps_link: string | null
          id: string
          is_active: boolean
          landmark: string | null
          latitude: number | null
          longitude: number | null
          name: string
          phone_number: string
          pincode: string
          state: string
          updated_at: string
        }
        Insert: {
          address: string
          city: string
          created_at?: string
          google_maps_link?: string | null
          id?: string
          is_active?: boolean
          landmark?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          phone_number: string
          pincode: string
          state: string
          updated_at?: string
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          google_maps_link?: string | null
          id?: string
          is_active?: boolean
          landmark?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          phone_number?: string
          pincode?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      pricing_plans: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          item_id: string
          item_type: string
          price_per_day: number
          price_per_hour: number | null
          price_per_month: number | null
          price_per_week: number | null
          price_per_year: number | null
          security_deposit_day: number | null
          security_deposit_month: number | null
          security_deposit_week: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          item_id: string
          item_type: string
          price_per_day: number
          price_per_hour?: number | null
          price_per_month?: number | null
          price_per_week?: number | null
          price_per_year?: number | null
          security_deposit_day?: number | null
          security_deposit_month?: number | null
          security_deposit_week?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          item_id?: string
          item_type?: string
          price_per_day?: number
          price_per_hour?: number | null
          price_per_month?: number | null
          price_per_week?: number | null
          price_per_year?: number | null
          security_deposit_day?: number | null
          security_deposit_month?: number | null
          security_deposit_week?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string
          full_name: string | null
          id_proof_url: string | null
          id_proof_url_updated: string | null
          last_name: string
          live_photo_url: string | null
          phone_number: string
          photo_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name: string
          full_name?: string | null
          id_proof_url?: string | null
          id_proof_url_updated?: string | null
          last_name: string
          live_photo_url?: string | null
          phone_number: string
          photo_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string
          full_name?: string | null
          id_proof_url?: string | null
          id_proof_url_updated?: string | null
          last_name?: string
          live_photo_url?: string | null
          phone_number?: string
          photo_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
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
      check_accessory_availability: {
        Args: {
          p_accessory_id: string
          p_pickup_date: string
          p_return_date: string
        }
        Returns: number
      }
      check_cycle_availability: {
        Args: {
          p_cycle_id: string
          p_pickup_date: string
          p_return_date: string
        }
        Returns: number
      }
      generate_accessory_serial: { Args: never; Returns: string }
      generate_cycle_serial: { Args: never; Returns: string }
      generate_partner_code: {
        Args: { p_partner_type: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "manager" | "viewer"
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
      app_role: ["admin", "user", "manager", "viewer"],
    },
  },
} as const
