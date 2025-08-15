-- Fix WebSocket connection issue
-- This will help with the realtime connection warning

-- 1. Check current realtime settings
SELECT '=== REALTIME SETTINGS ===' as status;
SELECT * FROM pg_stat_activity WHERE application_name LIKE '%supabase%';

-- 2. Grant realtime permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- 3. Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE merchants;
ALTER PUBLICATION supabase_realtime ADD TABLE quotations;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE products;

-- 4. Check publication status
SELECT '=== PUBLICATION STATUS ===' as status;
SELECT 
    schemaname,
    tablename,
    pubname
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
