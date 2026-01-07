'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import ProductForm from '@/components/ProductForm';

function NewProductContent() {
    const params = useSearchParams();
    const copyId = params.get('copy_id');
    const [initialData, setInitialData] = useState<any>(null);
    const [loading, setLoading] = useState(!!copyId);

    useEffect(() => {
        if (copyId) {
            fetchProductToCopy(copyId);
        }
    }, [copyId]);

    const fetchProductToCopy = async (id: string) => {
        const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
        if (data) {
            const { id: _, created_at: __, updated_at: ___, sku: ____, ...rest } = data;
            setInitialData(rest);
        }
        setLoading(false);
    };

    if (loading) return <div className="p-10 flex justify-center">Loading Copy...</div>;

    return (
        <div className="py-6">
            <ProductForm initialData={initialData} />
        </div>
    );
}

export default function NewProductPage() {
    return (
        <Suspense fallback={<div className="p-10 flex justify-center">Loading...</div>}>
            <NewProductContent />
        </Suspense>
    );
}
