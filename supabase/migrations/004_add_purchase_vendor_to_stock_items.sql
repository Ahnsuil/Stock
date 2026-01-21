-- Add purchase_vendor column to stock_items table
ALTER TABLE public.stock_items 
ADD COLUMN IF NOT EXISTS purchase_vendor TEXT;
