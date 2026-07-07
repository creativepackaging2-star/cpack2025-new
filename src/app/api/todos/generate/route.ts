import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Determines if an ink string requires a special ink check.
 * Rule: skip check if ink is ONLY plain CMYK — include if there's a number or specific PMS code.
 */
function inkNeedsCheck(ink: string | null | undefined): boolean {
    if (!ink) return false;
    const clean = ink.trim();
    // If it's exactly CMYK variants with no number → no check needed
    if (/^(CMYK|4C|4\s*COLOU?R)$/i.test(clean)) return false;
    // If there's any digit → special ink exists → needs check
    if (/\d/.test(clean)) return true;
    // Anything beyond plain CMYK
    return true;
}

/**
 * POST /api/todos/generate
 * Generates todo tasks for a given order_id.
 */
export async function POST(req: NextRequest) {
    const body = await req.json();
    const { order_id } = body;

    if (!order_id) {
        return NextResponse.json({ error: 'order_id is required' }, { status: 400 });
    }

    // Fetch the order with product details
    const { data: order, error: orderErr } = await supabase
        .from('orders')
        .select(`
            id,
            order_id,
            printer_name,
            ink,
            plate_no,
            products (
                ink,
                plate_no
            )
        `)
        .eq('id', order_id)
        .single();

    if (orderErr || !order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const ink = (order as any).products?.ink || (order as any).ink;
    const plateNo = (order as any).products?.plate_no || (order as any).plate_no;
    const printerName = (order as any).printer_name || 'Printer';
    const needsInkCheck = inkNeedsCheck(ink);

    // Prevent duplicate todos
    const { data: existing } = await supabase
        .from('order_todos')
        .select('id')
        .eq('order_id', order_id)
        .limit(1);

    if (existing && existing.length > 0) {
        return NextResponse.json({ message: 'Todos already exist for this order' });
    }

    const todos: Record<string, any>[] = [];
    let sort = 1;

    // 1. Send artwork for approval — always
    todos.push({ order_id, task_key: 'send_artwork', label: 'Send artwork for approval', sort_order: sort++, parent_key: null, meta: {} });

    // 2. Order paper — always
    todos.push({ order_id, task_key: 'order_paper', label: 'Order paper', sort_order: sort++, parent_key: null, meta: {} });

    // 3. Check ink — only if special ink (not plain CMYK)
    if (needsInkCheck) {
        todos.push({ order_id, task_key: 'check_ink', label: 'Check ink availability', sort_order: sort++, parent_key: null, meta: { ink, is_check: true, check_type: 'ink' } });
        todos.push({ order_id, task_key: 'order_ink', label: 'Order ink', sort_order: sort++, parent_key: 'check_ink', meta: { hidden: true } });
        todos.push({ order_id, task_key: 'followup_ink', label: 'Follow up for ink', sort_order: sort++, parent_key: 'check_ink', meta: { hidden: true } });
        todos.push({ order_id, task_key: 'rec_ink', label: 'Rec ink', sort_order: sort++, parent_key: 'check_ink', meta: { hidden: true } });
    }

    // 4. Rec artwork approval — always
    todos.push({ order_id, task_key: 'rec_artwork', label: 'Rec artwork approval', sort_order: sort++, parent_key: null, meta: {} });

    // 5. Plate check — always
    todos.push({ order_id, task_key: 'check_plate', label: 'Plate there?', sort_order: sort++, parent_key: null, meta: { plate_no: plateNo, is_check: true, check_type: 'plate' } });
    todos.push({ order_id, task_key: 'send_for_plate', label: 'Send for plate', sort_order: sort++, parent_key: 'check_plate', meta: { hidden: true } });
    todos.push({ order_id, task_key: 'rec_plate', label: 'Rec plate', sort_order: sort++, parent_key: 'check_plate', meta: { hidden: true } });

    // 6. Send order to printer — always
    todos.push({ order_id, task_key: 'send_to_printer', label: `Send order details to ${printerName}`, sort_order: sort++, parent_key: null, meta: { printer_name: printerName } });

    // 7. Send qty to punching/pasting vendor — always
    todos.push({ order_id, task_key: 'send_to_punching', label: 'Send qty to punching/pasting vendor', sort_order: sort++, parent_key: null, meta: {} });

    // 8. Check punch — always
    todos.push({ order_id, task_key: 'check_punch', label: 'Check if punch there', sort_order: sort++, parent_key: null, meta: { is_check: true, check_type: 'punch' } });
    todos.push({ order_id, task_key: 'send_for_punch', label: 'Send for punch', sort_order: sort++, parent_key: 'check_punch', meta: { hidden: true } });
    todos.push({ order_id, task_key: 'followup_punch', label: 'Follow up for punch', sort_order: sort++, parent_key: 'check_punch', meta: { hidden: true } });
    todos.push({ order_id, task_key: 'rec_punch', label: 'Rec punch', sort_order: sort++, parent_key: 'check_punch', meta: { hidden: true } });

    const { error: insertError } = await supabase.from('order_todos').insert(todos);

    if (insertError) {
        console.error('Error inserting todos:', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Todos generated', count: todos.length }, { status: 201 });
}
