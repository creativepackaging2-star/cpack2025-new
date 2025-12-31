const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8');
    console.log('DATABASE_URL present:', raw.includes('DATABASE_URL='));
    console.log('SUPABASE_URL present:', raw.includes('NEXT_PUBLIC_SUPABASE_URL='));
} else {
    console.log('.env.local not found');
}
