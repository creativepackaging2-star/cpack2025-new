
const fs = require('fs');
const path = require('path');
const https = require('https');

// Read env for URL and Key
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
        try {
            const schema = JSON.parse(data);
            console.log('--- TABLE TYPES ---');
            if (schema.definitions) {
                // In Swagger, there isn't a direct "type" field in definitions usually, 
                // but sometimes views are listed differently or we can check the path info
                Object.keys(schema.definitions).forEach(tableName => {
                    console.log(`- ${tableName}`);
                });
            }
        } catch (e) { console.error(e); }
    });
});
