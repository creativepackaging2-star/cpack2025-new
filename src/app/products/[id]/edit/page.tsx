'use client';

import { useEffect, useState, use } from 'react';
import ProductForm from '@/components/ProductForm';
import { supabase } from '@/utils/supabase/client';
import { Loader2 } from 'lucide-react';
import { Product } from '@/types';

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchProduct() {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('id', id)
                .single();

            if (data) {
                setProduct(data);
            }
            setLoading(false);
        }
        fetchProduct();
    }, [id]);

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>;
    if (!product) return <div className="p-10 text-center">Product not found</div>;

    return (
        <div className="py-6">
            <ProductForm initialData={product} />
        </div>
    );
}
