const { createClient } = require('@supabase/supabase-client');

const supabaseUrl = 'https://enpcdhhfsnmlhlplnycu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVucGNkaGhmc25tbGhscGxueWN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0ODIzMTEsImV4cCI6MjA4MDA1ODMxMX0.AW0m2SailxdtoIqNvLAZ7iVA0elWp0AoCAq5FpedDVU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFercarb() {
    console.log('Searching for Fercarb orders...');
    const { data, error } = await supabase
        .from('orders')
        .select('id, order_id, product_name, printer_name, printer_id, status')
        .or('product_name.ilike.%Fercarb%,product_sku.ilike.%Fercarb%');

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Found orders:');
        console.table(data);
    } else {
        console.log('No Fercarb orders found.');
    }
}

checkFercarb();
