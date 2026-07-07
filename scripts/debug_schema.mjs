
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkSchema() {
  console.log('Checking orders table columns...')
  const { data: orderCols, error: orderErr } = await supabase.rpc('get_table_columns', { table_name: 'orders' })
  if (orderErr) {
      // Fallback if RPC doesn't exist: try a query and check keys
      const { data: sampleOrder } = await supabase.from('orders').select('*').limit(1)
      console.log('Order columns (from sample):', Object.keys(sampleOrder?.[0] || {}))
  } else {
      console.log('Order columns:', orderCols)
  }

  console.log('\nChecking products table columns...')
  const { data: prodCols, error: prodErr } = await supabase.rpc('get_table_columns', { table_name: 'products' })
  if (prodErr) {
      const { data: sampleProd } = await supabase.from('products').select('*').limit(1)
      console.log('Product columns (from sample):', Object.keys(sampleProd?.[0] || {}))
  } else {
      console.log('Product columns:', prodCols)
  }
}

checkSchema()
8