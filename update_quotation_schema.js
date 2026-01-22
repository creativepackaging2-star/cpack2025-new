
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateSchema() {
    console.log('Attempting to update Supabase schema...');

    const sql = `
        ALTER TABLE quotations ADD COLUMN IF NOT EXISTS packing_rate DOUBLE PRECISION DEFAULT 5.333;
        ALTER TABLE quotations ADD COLUMN IF NOT EXISTS print_size_h DOUBLE PRECISION;
        ALTER TABLE quotations ADD COLUMN IF NOT EXISTS print_size_w DOUBLE PRECISION;
    `;

    try {
        const { error } = await supabase.rpc('exec_sql', { sql_string: sql });
        if (error) {
            console.error('Error updating schema:', error);
            console.log('Note: If exec_sql is not available, these new fields will only live in the UI for now.');
        } else {
            console.log('Schema updated successfully!');
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

updateSchema();
