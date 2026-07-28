export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      apartments: {
        Row: {
          id: string;
          number: string;
          name: string;
          description: string | null;
          monthly_rent: number;
          status: 'occupied' | 'vacant' | 'maintenance';
          bedrooms: number;
          bathrooms: number;
          area: number | null;
          floor: number | null;
          created_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          number: string;
          name: string;
          description?: string | null;
          monthly_rent: number;
          status?: 'occupied' | 'vacant' | 'maintenance';
          bedrooms?: number;
          bathrooms?: number;
          area?: number | null;
          floor?: number | null;
          created_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          number?: string;
          name?: string;
          description?: string | null;
          monthly_rent?: number;
          status?: 'occupied' | 'vacant' | 'maintenance';
          bedrooms?: number;
          bathrooms?: number;
          area?: number | null;
          floor?: number | null;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
        };
      };
      tenants: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          emergency_contact: string | null;
          emergency_phone: string | null;
          identification_number: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          email?: string | null;
          phone?: string | null;
          emergency_contact?: string | null;
          emergency_phone?: string | null;
          identification_number?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          email?: string | null;
          phone?: string | null;
          emergency_contact?: string | null;
          emergency_phone?: string | null;
          identification_number?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
        };
      };
      contracts: {
        Row: {
          id: string;
          apartment_id: string;
          tenant_id: string;
          start_date: string;
          end_date: string | null;
          monthly_rent: number;
          deposit_amount: number | null;
          deposit_paid: boolean;
          status: 'active' | 'expired' | 'terminated';
          notes: string | null;
          created_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          apartment_id: string;
          tenant_id: string;
          start_date: string;
          end_date?: string | null;
          monthly_rent: number;
          deposit_amount?: number | null;
          deposit_paid?: boolean;
          status?: 'active' | 'expired' | 'terminated';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          apartment_id?: string;
          tenant_id?: string;
          start_date?: string;
          end_date?: string | null;
          monthly_rent?: number;
          deposit_amount?: number | null;
          deposit_paid?: boolean;
          status?: 'active' | 'expired' | 'terminated';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          contract_id: string;
          amount: number;
          payment_date: string;
          due_date: string;
          payment_type: 'rent' | 'deposit' | 'late_fee' | 'other';
          payment_method: string | null;
          reference_number: string | null;
          notes: string | null;
          status: 'paid' | 'pending' | 'overdue' | 'cancelled';
          created_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          contract_id: string;
          amount: number;
          payment_date: string;
          due_date: string;
          payment_type: 'rent' | 'deposit' | 'late_fee' | 'other';
          payment_method?: string | null;
          reference_number?: string | null;
          notes?: string | null;
          status?: 'paid' | 'pending' | 'overdue' | 'cancelled';
          created_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          contract_id?: string;
          amount?: number;
          payment_date?: string;
          due_date?: string;
          payment_type?: 'rent' | 'deposit' | 'late_fee' | 'other';
          payment_method?: string | null;
          reference_number?: string | null;
          notes?: string | null;
          status?: 'paid' | 'pending' | 'overdue' | 'cancelled';
          created_at?: string;
          user_id?: string;
        };
      };
      expenses: {
        Row: {
          id: string;
          apartment_id: string | null;
          category: 'maintenance' | 'utilities' | 'repairs' | 'insurance' | 'taxes' | 'management' | 'other';
          expense_type: 'vacancy_maintenance' | 'rented';
          description: string;
          amount: number;
          expense_date: string;
          receipt_url: string | null;
          notes: string | null;
          created_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          apartment_id?: string | null;
          category: 'maintenance' | 'utilities' | 'repairs' | 'insurance' | 'taxes' | 'management' | 'other';
          expense_type?: 'vacancy_maintenance' | 'rented';
          description: string;
          amount: number;
          expense_date: string;
          receipt_url?: string | null;
          notes?: string | null;
          created_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          apartment_id?: string | null;
          category?: 'maintenance' | 'utilities' | 'repairs' | 'insurance' | 'taxes' | 'management' | 'other';
          expense_type?: 'vacancy_maintenance' | 'rented';
          description?: string;
          amount?: number;
          expense_date?: string;
          receipt_url?: string | null;
          notes?: string | null;
          created_at?: string;
          user_id?: string;
        };
      };
    };
  };
}

export type Apartment = Database['public']['Tables']['apartments']['Row'];
export type Tenant = Database['public']['Tables']['tenants']['Row'];
export type Contract = Database['public']['Tables']['contracts']['Row'];
export type Payment = Database['public']['Tables']['payments']['Row'];
export type Expense = Database['public']['Tables']['expenses']['Row'];

export type ApartmentInsert = Database['public']['Tables']['apartments']['Insert'];
export type TenantInsert = Database['public']['Tables']['tenants']['Insert'];
export type ContractInsert = Database['public']['Tables']['contracts']['Insert'];
export type PaymentInsert = Database['public']['Tables']['payments']['Insert'];
export type ExpenseInsert = Database['public']['Tables']['expenses']['Insert'];

export interface ContractWithRelations extends Contract {
  apartment: Apartment;
  tenant: Tenant;
}

export interface PaymentWithRelations extends Payment {
  contract: ContractWithRelations;
}
