-- Add unit type (box/pcs) to stock_items
ALTER TABLE public.stock_items
  ADD COLUMN IF NOT EXISTS unit_type text DEFAULT 'pcs'
  CHECK (unit_type IN ('box', 'pcs'));

-- Add department field to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS department text;

-- Create index for department filtering
CREATE INDEX IF NOT EXISTS idx_users_department ON public.users(department);

-- Create discarded_items table for tracking damaged/broken/expired items
CREATE TABLE IF NOT EXISTS public.discarded_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
    quantity_discarded INTEGER NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('damaged', 'broken', 'expired')),
    discarded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    notes TEXT,
    discarded_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create trigger for discarded_items updated_at
CREATE TRIGGER update_discarded_items_updated_at BEFORE UPDATE ON public.discarded_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for discarded_items
CREATE INDEX IF NOT EXISTS idx_discarded_items_item_id ON public.discarded_items(item_id);
CREATE INDEX IF NOT EXISTS idx_discarded_items_discarded_by ON public.discarded_items(discarded_by);
CREATE INDEX IF NOT EXISTS idx_discarded_items_reason ON public.discarded_items(reason);

-- Enable RLS for discarded_items
ALTER TABLE public.discarded_items ENABLE ROW LEVEL SECURITY;

-- Create policy for discarded_items
CREATE POLICY "Allow all operations on discarded_items" ON public.discarded_items
    FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions for discarded_items
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discarded_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discarded_items TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create item_transfers table for guest users to transfer items between users
CREATE TABLE IF NOT EXISTS public.item_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issued_item_id UUID NOT NULL REFERENCES public.issued_items(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    transfer_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create trigger for item_transfers updated_at
CREATE TRIGGER update_item_transfers_updated_at BEFORE UPDATE ON public.item_transfers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for item_transfers
CREATE INDEX IF NOT EXISTS idx_item_transfers_issued_item_id ON public.item_transfers(issued_item_id);
CREATE INDEX IF NOT EXISTS idx_item_transfers_from_user_id ON public.item_transfers(from_user_id);
CREATE INDEX IF NOT EXISTS idx_item_transfers_to_user_id ON public.item_transfers(to_user_id);

-- Enable RLS for item_transfers
ALTER TABLE public.item_transfers ENABLE ROW LEVEL SECURITY;

-- Create policy for item_transfers
CREATE POLICY "Allow all operations on item_transfers" ON public.item_transfers
    FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions for item_transfers
GRANT SELECT, INSERT, UPDATE, DELETE ON public.item_transfers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.item_transfers TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
