export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      app_users: {
        Row: {
          age_group: string;
          city: string;
          created_at: string;
          date_of_birth: string;
          email: string;
          first_name: string;
          id: string;
          last_name: string;
          phone: string;
          postal_code: string;
          school_city: string;
          school_id: string;
          school_kind: string;
          school_name: string;
          school_state: string;
          state: string;
          status: string;
          street_address: string;
        };
        Insert: {
          age_group: string;
          city?: string;
          created_at?: string;
          date_of_birth: string;
          email: string;
          first_name: string;
          id?: string;
          last_name?: string;
          phone?: string;
          postal_code?: string;
          school_city?: string;
          school_id?: string;
          school_kind?: string;
          school_name?: string;
          school_state?: string;
          state?: string;
          status: string;
          street_address?: string;
        };
        Update: {
          age_group?: string;
          city?: string;
          created_at?: string;
          date_of_birth?: string;
          email?: string;
          first_name?: string;
          id?: string;
          last_name?: string;
          phone?: string;
          postal_code?: string;
          school_city?: string;
          school_id?: string;
          school_kind?: string;
          school_name?: string;
          school_state?: string;
          state?: string;
          status?: string;
          street_address?: string;
        };
        Relationships: [];
      };
      consents: {
        Row: {
          created_at: string;
          decided_at: string | null;
          decision: string;
          guardian_email: string;
          id: string;
          token: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          decided_at?: string | null;
          decision: string;
          guardian_email: string;
          id?: string;
          token: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          decided_at?: string | null;
          decision?: string;
          guardian_email?: string;
          id?: string;
          token?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "consents_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "app_users";
            referencedColumns: ["id"];
          },
        ];
      };
      goals: {
        Row: {
          created_at: string;
          current_amount_cents: number;
          id: string;
          linked_account_id: string | null;
          name: string;
          saved_plan: Record<string, unknown> | null;
          saved_plan_at: string | null;
          target_amount_cents: number;
          target_date: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          current_amount_cents?: number;
          id?: string;
          linked_account_id?: string | null;
          name: string;
          saved_plan?: Record<string, unknown> | null;
          saved_plan_at?: string | null;
          target_amount_cents: number;
          target_date: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          current_amount_cents?: number;
          id?: string;
          linked_account_id?: string | null;
          name?: string;
          saved_plan?: Record<string, unknown> | null;
          saved_plan_at?: string | null;
          target_amount_cents?: number;
          target_date?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "goals_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "app_users";
            referencedColumns: ["id"];
          },
        ];
      };
      bank_connections: {
        Row: {
          id: string;
          user_id: string;
          bank_id: string;
          bank_name: string;
          bank_city: string;
          bank_state: string;
          domain: string | null;
          item_id: string | null;
          access_token: string | null;
          institution_id: string | null;
          connected_at: string;
          last_refreshed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          bank_id: string;
          bank_name: string;
          bank_city?: string;
          bank_state?: string;
          domain?: string | null;
          item_id?: string | null;
          access_token?: string | null;
          institution_id?: string | null;
          connected_at?: string;
          last_refreshed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          bank_id?: string;
          bank_name?: string;
          bank_city?: string;
          bank_state?: string;
          domain?: string | null;
          item_id?: string | null;
          access_token?: string | null;
          institution_id?: string | null;
          connected_at?: string;
          last_refreshed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bank_connections_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "app_users";
            referencedColumns: ["id"];
          },
        ];
      };
      bank_accounts: {
        Row: {
          id: string;
          connection_id: string;
          user_id: string;
          external_id: string;
          name: string;
          account_type: string;
          balance_cents: number;
          currency: string;
          last_updated_at: string;
        };
        Insert: {
          id?: string;
          connection_id: string;
          user_id: string;
          external_id: string;
          name: string;
          account_type: string;
          balance_cents?: number;
          currency?: string;
          last_updated_at?: string;
        };
        Update: {
          id?: string;
          connection_id?: string;
          user_id?: string;
          external_id?: string;
          name?: string;
          account_type?: string;
          balance_cents?: number;
          currency?: string;
          last_updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bank_accounts_connection_id_fkey";
            columns: ["connection_id"];
            isOneToOne: false;
            referencedRelation: "bank_connections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bank_accounts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "app_users";
            referencedColumns: ["id"];
          },
        ];
      };
      expenses: {
        Row: {
          id: string;
          user_id: string;
          merchant: string;
          purchase_date: string;
          amount_cents: number;
          category: string;
          receipt_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          merchant: string;
          purchase_date: string;
          amount_cents: number;
          category: string;
          receipt_path: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          merchant?: string;
          purchase_date?: string;
          amount_cents?: number;
          category?: string;
          receipt_path?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "app_users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
