
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function backupTable(tableName) {
    console.log(`Backing up ${tableName}...`);
    const { data, error } = await supabase.from(tableName).select('*');
    if (error) {
        console.error(`Error backing up ${tableName}:`, error.message);
        return;
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${tableName}_${timestamp}.json`;
    const filePath = path.resolve(__dirname, 'backups', filename);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Saved ${data.length} rows to ${filename}`);
}

async function runBackup() {
    if (!fs.existsSync('backups')) {
        fs.mkdirSync('backups');
    }

    const tables = ['orders', 'products', 'customers', 'sizes', 'printers', 'paperwala', 'paper_types', 'gsm'];
    for (const t of tables) {
        await backupTable(t);
    }
}

runBackup();
