-- Ensure anon can INSERT into stock_items (idempotent)
GRANT INSERT ON public.stock_items TO anon;

-- Reload PostgREST schema cache so it picks up allowed methods
NOTIFY pgrst, 'reload schema';
