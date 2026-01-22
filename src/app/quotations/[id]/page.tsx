
'use client';

import QuotationForm from '@/components/QuotationForm';
import { supabase } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function EditQuotationPage() {
    const params = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchQuote() {
            const { data, error } = await supabase
                .from('quotations')
                .select('*')
                .eq('id', params.id)
                .single();

            if (data) setData(data);
            setLoading(false);
        }
        if (params.id) fetchQuote();
    }, [params.id]);

    if (loading) return <div className="p-20 text-center font-mono text-slate-400">Loading Quote...</div>;
    if (!data) return <div className="p-20 text-center font-mono text-slate-400">Quote not found.</div>;

    return <QuotationForm initialData={data} />;
}
