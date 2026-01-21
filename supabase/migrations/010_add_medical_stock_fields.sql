-- Add stock category: 'general' (existing) or 'medical'
ALTER TABLE public.stock_items
  ADD COLUMN IF NOT EXISTS stock_category text NOT NULL DEFAULT 'general'
  CHECK (stock_category IN ('general', 'medical'));

-- Medical-specific: expiry date and batch number (nullable for general)
ALTER TABLE public.stock_items
  ADD COLUMN IF NOT EXISTS expiry_date date,
  ADD COLUMN IF NOT EXISTS batch_number text;

-- Backfill: ensure existing rows are general (default handles new inserts)
UPDATE public.stock_items SET stock_category = 'general' WHERE stock_category IS NULL;

-- Index for filtering by category
CREATE INDEX IF NOT EXISTS idx_stock_items_stock_category ON public.stock_items(stock_category);
CREATE INDEX IF NOT EXISTS idx_stock_items_expiry_date ON public.stock_items(expiry_date) WHERE expiry_date IS NOT NULL;
