'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import OrderForm from '@/components/OrderForm';
import { Order } from '@/types';
import { Loader2 } from 'lucide-react';

export default function EditOrderPage() {
    const params = useParams();
    const id = params.id as string;
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchOrder();
        }
    }, [id]);

    async function fetchOrder() {
        setLoading(true);
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('id', id)
            .single();

        if (data) setOrder(data);
        setLoading(false);
    }

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;

    if (!order) return <div className="p-10 text-center text-slate-500">Order not found.</div>;

    return (
        <div className="py-6">
            <OrderForm initialData={order} productId={order.product_id} />
        </div>
    );
}
