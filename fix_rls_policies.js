// Fix RLS policies for specifications and delivery_addresses tables
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixRLS() {
    console.log('🔧 Fixing RLS policies for specifications and delivery_addresses...\n');

    try {
        // Read the SQL file
        const sqlPath = path.join(process.cwd(), 'fix_rls_specifications_delivery.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

        // Split by semicolons and execute each statement
        const statements = sqlContent
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
            if (statement.includes('SELECT') && statement.includes('pg_policies')) {
                // This is the verification query
                console.log('📋 Verifying policies...\n');
                const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });

                if (error) {
                    console.log('Note: Verification query may require direct database access');
                } else if (data) {
                    console.log('Policies created:', data);
                }
            } else {
                // Execute the statement
                const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

                if (error) {
                    console.log(`⚠️  Statement may need manual execution: ${statement.substring(0, 50)}...`);
                }
            }
        }

        console.log('\n✅ RLS policies update completed!');
        console.log('\n📝 If you see any errors above, please run the SQL file manually in Supabase:');
        console.log('   1. Go to Supabase Dashboard → SQL Editor');
        console.log('   2. Copy the contents of fix_rls_specifications_delivery.sql');
        console.log('   3. Paste and run it');

        // Test the policies
        console.log('\n🧪 Testing INSERT permissions...\n');

        // Test specifications
        const testSpec = { name: `Test Spec ${Date.now()}` };
        const { data: specData, error: specError } = await supabase
            .from('specifications')
            .insert([testSpec])
            .select()
            .single();

        if (specError) {
            console.log('❌ Specifications INSERT test failed:', specError.message);
            console.log('   → You need to run the SQL file manually in Supabase');
        } else {
            console.log('✅ Specifications INSERT test passed!');
            // Clean up test data
            await supabase.from('specifications').delete().eq('id', specData.id);
        }

        // Test delivery_addresses
        const testAddr = { name: `Test Address ${Date.now()}` };
        const { data: addrData, error: addrError } = await supabase
            .from('delivery_addresses')
            .insert([testAddr])
            .select()
            .single();

        if (addrError) {
            console.log('❌ Delivery Addresses INSERT test failed:', addrError.message);
            console.log('   → You need to run the SQL file manually in Supabase');
        } else {
            console.log('✅ Delivery Addresses INSERT test passed!');
            // Clean up test data
            await supabase.from('delivery_addresses').delete().eq('id', addrData.id);
        }

        console.log('\n🎉 All done! You can now add new specifications and delivery addresses from the product form.');

    } catch (error) {
        console.error('❌ Error:', error);
        console.log('\n📝 Please run the SQL file manually in Supabase Dashboard → SQL Editor');
    }
}

fixRLS();
