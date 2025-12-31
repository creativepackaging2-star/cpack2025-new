const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load env
const envPath = path.resolve(__dirname, '.env.local');
const env = {};
if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach(l => {
        const parts = l.split('=');
        if (parts.length >= 2) {
            env[parts[0].trim()] = parts.slice(1).join('=').trim();
        }
    });
}

if (!env.DATABASE_URL) {
    console.error("DATABASE_URL not found in .env.local. Cannot deploy trigger.");
    // Try to construct it from SUPABASE_URL if possible? No, we need the postgres connection string.
    console.error("Please ensure DATABASE_URL is set in .env.local (e.g. postgres://postgres.[ref]:[password]@[host]:6543/postgres)");
    process.exit(1);
}

const client = new Client({
    connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const sql = fs.readFileSync('propagate_product_updates.sql', 'utf8');

(async () => {
    try {
        await client.connect();
        console.log("Connected to database. Deploying trigger...");
        await client.query(sql);
        console.log("Trigger deployed successfully.");
    } catch (e) {
        console.error("Error deploying trigger:", e);
    } finally {
        await client.end();
    }
})();
