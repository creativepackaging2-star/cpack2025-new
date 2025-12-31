const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env
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

// 1. Service Role Client (Admin)
const supabaseAdmin = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY // Fallback (will fail admin tasks if only anon)
);

// 2. Public Client (Anon)
const supabaseAnon = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
    console.log('--- DEBUGGING STORAGE ---');

    // TEST 1: Check if bucket exists (Requires Admin/Service Role usually to list all or check config)
    console.log('1. Checking Bucket "product-files"...');
    const { data: buckets, error: bucketError } = await supabaseAdmin.storage.listBuckets();

    if (bucketError) {
        console.error('   Error listing buckets (Check Service Role Key):', bucketError.message);
    } else {
        const bucket = buckets.find(b => b.name === 'product-files');
        console.log('   Create buckets found: ', buckets.map(b => b.name).join(', '));

        if (bucket) {
            console.log('   ✅ Bucket "product-files" EXISTS.');
            console.log('   Public:', bucket.public);
        } else {
            console.error('   ❌ Bucket "product-files" DOES NOT EXIST.');
        }
    }

    // TEST 2: Try Uploading with ANON Key (Simulates App)
    console.log('\n2. Testing Upload with ANON Key...');
    const testFile = Buffer.from('Test file content');
    const fileName = `debug_test_${Date.now()}.txt`;

    const { data: uploadData, error: uploadError } = await supabaseAnon.storage
        .from('product-files')
        .upload(fileName, testFile);

    if (uploadError) {
        console.error('   ❌ Upload FAILED:', JSON.stringify(uploadError, null, 2));
        // Check for specific error codes
        if (uploadError.statusCode === '403' || uploadError.error === 'Unauthorized') {
            console.error('   -> CAUSE: RLS Policy incorrect (Forbidden)');
        }
        if (uploadError.statusCode === '404' || uploadError.error === 'Not Found') {
            console.error('   -> CAUSE: Bucket does not exist or wrong name');
        }
    } else {
        console.log('   ✅ Upload SUCCESS:', uploadData);

        // Clean up
        await supabaseAdmin.storage.from('product-files').remove([fileName]);
    }

    console.log('\nIf Upload Failed, you need to run the SQL to enable PUBLIC INSERT access.');
})();
