import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET /api/todos?filter=pending|all|done
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'pending';

    let query = supabase
        .from('order_todos')
        .select(`
            *,
            orders (
                id,
                order_id,
                product_name,
                printer_name,
                quantity,
                progress,
                products (
                    product_name,
                    ink,
                    plate_no
                )
            )
        `)
        .order('order_id', { ascending: false })
        .order('sort_order', { ascending: true });

    if (filter === 'pending') {
        query = (query as any).eq('done', false).eq('skipped', false);
    } else if (filter === 'done') {
        query = (query as any).or('done.eq.true,skipped.eq.true');
    }

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
}

// PATCH /api/todos — update a todo item
export async function PATCH(req: NextRequest) {
    const body = await req.json();
    const { id, done, skipped } = body;

    if (!id) {
        return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const update: Record<string, any> = { updated_at: new Date().toISOString() };
    if (typeof done === 'boolean') update.done = done;
    if (typeof skipped === 'boolean') update.skipped = skipped;

    const { error } = await supabase.from('order_todos').update(update).eq('id', id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Updated' });
}
