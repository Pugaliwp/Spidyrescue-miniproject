-- Disable Row Level Security to allow all operations (Insert, Update, Select) without complex policies
ALTER TABLE leaderboard DISABLE ROW LEVEL SECURITY;

-- Alternatively, if you prefer to keep RLS enabled, run these instead (comment out the line above):
-- CREATE POLICY "Enable access for all users" ON "public"."leaderboard"
-- AS PERMISSIVE FOR ALL
-- TO public
-- USING (true)
-- WITH CHECK (true);
