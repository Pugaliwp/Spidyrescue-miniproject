
// Leaderboard data manager

// Safety utility
function isDbReady() {
    if (typeof db === 'undefined') {
        console.error("Supabase DB client is not initialized. Check supabase_client.js");
        alert("Game Error: Database connection failed. Please check credentials.");
        return false;
    }
    return true;
}

async function fetchLeaderboard() {
    if (!isDbReady()) return [];

    try {
        const { data, error } = await db
            .from('leaderboard')
            .select('name, score')
            .order('score', { ascending: false })
            .limit(500);

        if (error) {
            console.error('Error fetching leaderboard:', error);
            return [];
        }

        return data;
    } catch (e) {
        console.error('Unexpected error fetching leaderboard:', e);
        return [];
    }
}

// Check if a username already exists in the database
async function checkUserExists(playerName) {
    if (!isDbReady()) return false;

    try {
        const { data, error } = await db
            .from('leaderboard')
            .select('name')
            .eq('name', playerName)
            .limit(1); // Use limit(1) so it doesn't fail if duplicates exist

        if (error) {
            console.error('Error checking user:', error);
            return false;
        }

        return data && data.length > 0;
    } catch (e) {
        console.error('Unexpected error checking user:', e);
        return false;
    }
}

async function submitScore(playerName, scoreVal) {
    if (!isDbReady()) return false;
    if (!playerName) playerName = "Anonymous";

    try {
        const { data: existing, error: fetchError } = await db
            .from('leaderboard')
            .select('score')
            .eq('name', playerName)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error checking existing score:', fetchError);
            return false;
        }

        let shouldUpdate = false;
        if (!existing) {
            shouldUpdate = true;
        } else if (scoreVal > existing.score) {
            shouldUpdate = true;
        }

        if (shouldUpdate) {
            const { error: upsertError } = await db
                .from('leaderboard')
                .upsert({ name: playerName, score: scoreVal }, { onConflict: 'name' });

            if (upsertError) {
                console.error('Error submitting score:', upsertError);
                return { success: false, error: upsertError };
            }
            console.log(`New High Score submitted for ${playerName}: ${scoreVal}`);
            return { success: true, error: null };
        } else {
            return { success: true, error: null };
        }

    } catch (e) {
        console.error('Unexpected error submitting score:', e);
        return { success: false, error: e };
    }
}
