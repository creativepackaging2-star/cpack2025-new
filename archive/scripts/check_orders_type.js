
const fs = require('fs');
const path = require('path');
const https = require('https');

const envPath = path.join(__dirname, '.env.local');
let envVars = {};
try {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const [key, ...valParts] = trimmed.split('=');
            envVars[key.trim()] = valParts.join('=').trim();
        }
    });
} catch (e) { }

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const swaggerUrl = `${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`;

https.get(swaggerUrl, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const schema = JSON.parse(data);
        console.log('Checking if "orders" is a table or view...\n');

        // Check paths for orders
        if (schema.paths && schema.paths['/orders']) {
            const ordersPath = schema.paths['/orders'];
            console.log('Orders endpoint exists');
            console.log('Methods:', Object.keys(ordersPath));

            // Check if PATCH/PUT exists (indicates updateable)
            if (ordersPath.patch) {
                console.log('\n✓ orders supports PATCH (updateable)');
            } else {
                console.log('\n✗ orders does NOT support PATCH (read-only view?)');
            }
        }
    });
});
