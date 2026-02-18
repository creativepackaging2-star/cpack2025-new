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

// Public Client (Anon) - This is what the browser uses
const supabaseAnon = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

(async () => {
    console.log('--- DEBUGGING STORAGE UPLOAD (ANON) ---');
    console.log('Attempting upload to "product-files"...');

    const testFile = Buffer.from('Test file content ' + Date.now());
    const fileName = `debug_anon_${Date.now()}.txt`;

    const { data: uploadData, error: uploadError } = await supabaseAnon.storage
        .from('product-files')
        .upload(fileName, testFile);

    if (uploadError) {
        console.error('❌ Upload FAILED:', JSON.stringify(uploadError, null, 2));
    } else {
        console.log('✅ Upload SUCCESS:', uploadData);
        console.log('   (This means the bucket is PUBLIC and writable)');

        // Clean up
        const { error: rmError } = await supabaseAnon.storage.from('product-files').remove([fileName]);
        if (rmError) console.error('   Note: Cleanup failed (Delete policy might be missing)', rmError.message);
        else console.log('   Cleanup successful.');
    }
})();
