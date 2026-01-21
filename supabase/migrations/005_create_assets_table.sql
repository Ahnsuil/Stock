-- Create assets table
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_number VARCHAR NOT NULL UNIQUE,
    item_name VARCHAR NOT NULL,
    item_type VARCHAR NOT NULL,
    purchase_date DATE NOT NULL,
    purchase_price NUMERIC NOT NULL,
    current_location VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'discarded')),
    discard_reason TEXT,
    discard_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create trigger for updated_at
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_assets_item_number ON public.assets(item_number);
CREATE INDEX IF NOT EXISTS idx_assets_status ON public.assets(status);

-- Enable Row Level Security
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Create RLS policy to allow all operations
CREATE POLICY "Allow all operations on assets" ON public.assets
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Grant permissions to anon role
GRANT ALL ON public.assets TO anon;
GRANT ALL ON public.assets TO authenticated;
