-- Enable realtime for collections & products (Supabase Dashboard → Database → Replication)
-- Or run if your project supports publication API:

alter publication supabase_realtime add table public.collections;
alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.tickets;
