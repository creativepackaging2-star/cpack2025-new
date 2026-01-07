
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkSplitOrders() {
    const { data, error } = await supabase
        .from('orders')
        .select('id, order_id, status, progress, quantity')
        .or('order_id.ilike.%-P%,order_id.ilike.%SPLIT-%')

    if (error) {
        console.error('Error:', error)
        return
    }

    console.log('Orders matching split criteria:')
    data.forEach(o => {
        console.log(`ID: ${o.id}, OrderID: ${o.order_id}, Status: ${o.status}, Progress: ${o.progress}`)
    })
}

checkSplitOrders()
