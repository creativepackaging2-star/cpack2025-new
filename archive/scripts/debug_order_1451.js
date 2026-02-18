const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables
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

async function inspectOrder() {
    const id = 1451;
    console.log(`Fetching Order ID: ${id}...`);

    const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching order:', error);
        return;
    }

    console.log('\n--- Order Data ---');
    console.log('ID:', order.id);
    console.log('Delivery Address:', order.delivery_address);
    // Check for potential address fields if different
    console.log('Address (alt):', order.address, order.shipping_address);
    console.log('Category Name:', order.category_name);
    console.log('Product ID:', order.product_id);
    console.log('Folding:', order.folding);
    console.log('Folding Dim:', order.folding_dim);
    console.log('Folding Dimension (old):', order.folding_dimension);
    console.log('Construction:', order.construction);
    console.log('Specification:', order.specification);
    console.log('Specs:', order.specs);
    console.log('------------------\n');

    // Also check the product to see what it has
    if (order.product_id) {
        const { data: product, error: prodError } = await supabase
            .from('products')
            .select('*')
            .eq('id', order.product_id)
            .single();

        if (product) {
            console.log('--- Related Product Data ---');
            console.log('Product Folding:', product.folding);
            console.log('Product Folding Dim:', product.folding_dim);
            console.log('Product Category:', product.category_name); // Check if joined or raw
            // If category is a relation, we might need to fetch it
        }
    }
}

inspectOrder();
