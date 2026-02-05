
// Initialize Supabase Client
// REPLACE THESE WITH YOUR ACTUAL SUPABASE PROJECT CREDENTIALS
const SUPABASE_URL = 'https://woadzyxugccyachxvhje.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_gGyGaqYWx-IXwDyfthpaGg___OqOyPP';

// Check if supabase object is available (loaded via CDN in index.html)
if (typeof supabase === 'undefined') {
    console.error('Supabase library not loaded. Make sure the script tag is in index.html');
}

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('Supabase Client Initialized');
