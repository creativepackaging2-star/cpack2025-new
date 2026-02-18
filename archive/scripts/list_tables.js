
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function listTables() {
    try {
        const { data, error } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public');

        // Note: accessing information_schema might be restricted for anon key.
        // If this fails, we'll try a different approach or just rely on file cleanup.

        if (error) {
            console.log("Could not list tables (permissions?):", error.message);
            // Fallback: Try to select from a few likely candidates to see if they exist
            const candidates = ['orders_backup', 'test', 'temp_orders'];
            for (const c of candidates) {
                const { error: e } = await supabase.from(c).select('count(*)', { count: 'exact', head: true });
                if (!e) console.log(`Table '${c}' exists.`);
            }
        } else {
            console.log("Tables in public schema:");
            data.forEach(t => console.log(`- ${t.table_name}`));
        }
    } catch (e) {
        console.error(e);
    }
}

listTables();
