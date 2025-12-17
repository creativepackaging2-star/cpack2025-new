const fs = require('fs');
const path = require('path');
const https = require('https');

// Read env for URL and Key
const envPath = path.join(__dirname, '..', '.env.local');
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

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

// Construct Swagger URL: https://your-ref.supabase.co/rest/v1/?apikey=...
const swaggerUrl = `${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`;

console.log('Fetching schema from:', swaggerUrl);

https.get(swaggerUrl, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const schema = JSON.parse(data);
            console.log('\n--- DISCOVERED TABLES ---');
            if (schema.definitions) {
                Object.keys(schema.definitions).forEach(tableName => {
                    console.log(`- ${tableName}`);
                });
            } else {
                console.log('No definitions found. Response:', data.substring(0, 200));
            }
        } catch (e) {
            console.error('Failed to parse JSON:', e);
            console.log('Raw Data:', data.substring(0, 500));
        }
    });
}).on('error', (e) => {
    console.error('Request failed:', e);
});
