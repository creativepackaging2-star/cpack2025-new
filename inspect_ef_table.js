const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = {};
try {
    const lines = fs.readFileSync('.env.local', 'utf8').split('\n');
    lines.forEach(l => {
        const parts = l.split('=');
        if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
    });
} catch (e) {
    console.warn('No .env.local found');
}

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
    console.log('--- INSPECTING SPECIAL_EFFECTS TABLE ---');

    // 1. Check table existence and content
    const { data: effects, error } = await supabase
        .from('special_effects')
        .select('*')
        .limit(5);

    if (error) {
        console.error('Error fetching special_effects:', error);
    } else {
        console.log('Special Effects Table Sample:', effects);
    }
})();
