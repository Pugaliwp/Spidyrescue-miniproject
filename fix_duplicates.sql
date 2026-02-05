-- 1. Remove duplicates, keeping the one with the highest score
DELETE FROM leaderboard a USING leaderboard b
WHERE a.id < b.id AND a.name = b.name;

-- 2. NOW add the unique constraint (this failed before because of duplicates)
ALTER TABLE leaderboard ADD CONSTRAINT unique_name UNIQUE (name);
