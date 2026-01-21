-- Ensure purchase_vendor exists on stock_items (idempotent)
ALTER TABLE public.stock_items
ADD COLUMN IF NOT EXISTS purchase_vendor TEXT;

-- Create purchase_history if not exists (for restock tracking)
CREATE TABLE IF NOT EXISTS public.purchase_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
    purchase_vendor TEXT,
    quantity_added INTEGER NOT NULL CHECK (quantity_added > 0),
    purchase_date TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS and policies for purchase_history
ALTER TABLE public.purchase_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on purchase_history" ON public.purchase_history;
CREATE POLICY "Allow all operations on purchase_history" ON public.purchase_history
    FOR ALL USING (true) WITH CHECK (true);

-- Grants for anon, authenticated, authenticator
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_history TO anon, authenticated;
GRANT SELECT ON public.purchase_history TO authenticator;
