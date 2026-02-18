const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const envLines = envContent.split('\n');
const env = {};
envLines.forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
        env[key.trim()] = valueParts.join('=').trim();
    }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
    console.log('=== BACKING UP ORDERS TABLE ===\n');

    // Get all orders
    const { data: orders, error } = await supabase
        .from('orders')
        .select('*');

    if (error) {
        console.error('Error fetching orders:', error);
        return;
    }

    console.log(`Fetched ${orders.length} orders`);

    // Save to file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `orders_backup_${timestamp}.json`;

    fs.writeFileSync(filename, JSON.stringify(orders, null, 2));

    console.log(`\n✅ Backup saved to: ${filename}`);
    console.log(`File size: ${(fs.statSync(filename).size / 1024).toFixed(2)} KB`);

    // Also create a summary
    const summary = {
        backup_date: new Date().toISOString(),
        total_orders: orders.length,
        orders_with_ups: orders.filter(o => o.ups != null).length,
        orders_with_specs: orders.filter(o => o.specs != null && o.specs != '').length,
        orders_with_product_id: orders.filter(o => o.product_id != null).length,
        sample_orders: orders.slice(0, 3).map(o => ({
            id: o.id,
            product_id: o.product_id,
            ups: o.ups,
            specs: o.specs?.substring(0, 50) + '...'
        }))
    };

    console.log('\n=== BACKUP SUMMARY ===');
    console.log(JSON.stringify(summary, null, 2));

    const summaryFilename = `orders_backup_summary_${timestamp}.json`;
    fs.writeFileSync(summaryFilename, JSON.stringify(summary, null, 2));
    console.log(`\nSummary saved to: ${summaryFilename}`);
})();
