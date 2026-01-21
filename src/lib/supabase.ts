import { createClient } from '@supabase/supabase-js'

// Prefer .env; otherwise use hosted Supabase so the app works without Docker.
// For local Docker Supabase, set VITE_SUPABASE_URL=http://localhost:3001 in .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://aotnzpyahbyphkdouzbq.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvdG56cHlhaGJ5cGhrZG91emJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMDkwOTgsImV4cCI6MjA3Njg4NTA5OH0.xb7J1zgieeu9ItZKJmwxkl3VYs5F6mEfGnWnzW6RLS4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public',
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          email: string
          role: 'admin' | 'guest'
          password_hash: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          role?: 'admin' | 'guest'
          password_hash: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: 'admin' | 'guest'
          password_hash?: string
          created_at?: string
          updated_at?: string
        }
      }
      stock_items: {
        Row: {
          id: string
          name: string
          type: string
          quantity: number
          description: string | null
          purchase_vendor: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          quantity?: number
          description?: string | null
          purchase_vendor?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          quantity?: number
          description?: string | null
          purchase_vendor?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      requests: {
        Row: {
          id: string
          user_id: string
          items: Array<{item_id: string, quantity: number, item_name: string}>
          status: 'pending' | 'approved' | 'rejected'
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          items: Array<{item_id: string, quantity: number, item_name: string}>
          status?: 'pending' | 'approved' | 'rejected'
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          items?: Array<{item_id: string, quantity: number, item_name: string}>
          status?: 'pending' | 'approved' | 'rejected'
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      issued_items: {
        Row: {
          id: string
          item_id: string
          user_id: string
          request_id: string | null
          quantity_issued: number
          issued_date: string
          return_due: string
          returned: boolean
          return_date: string | null
          admin_notes: string | null
          issued_to: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          item_id: string
          user_id: string
          request_id?: string | null
          quantity_issued: number
          issued_date?: string
          return_due: string
          returned?: boolean
          return_date?: string | null
          admin_notes?: string | null
          issued_to?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          item_id?: string
          user_id?: string
          request_id?: string | null
          quantity_issued?: number
          issued_date?: string
          return_due?: string
          returned?: boolean
          return_date?: string | null
          admin_notes?: string | null
          issued_to?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
