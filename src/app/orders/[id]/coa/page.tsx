'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { Order } from '@/types';
import COATemplate from '@/components/COATemplate';

export default function COAPage() {
    const params = useParams();
    // Safely get ID from params
    const id = params ? (params.id as string) : null;

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchOrder = async () => {
            if (!id) {
                setLoading(false);
                return;
            }

            try {
                if (id === 'sample') {
                    const sampleOrder: Order = {
                        id: 0,
                        order_id: 'ORD/25-26/1024',
                        product_name: 'AZITHROMYCIN TABLETS 500MG (FOIL CARTON)',
                        customer_name: 'MEDICARE PHARMACEUTICALS PVT. LTD.',
                        delivery_address: 'Plot No. 12-B, Pharma City, Selaqui, Dehradun, Uttarakhand - 248011',
                        quantity: 25000,
                        order_date: '2025-12-20',
                        batch_no: 'AZ-FL-9921',
                        inv_no: 'CP/2245/25',
                        artwork_code: 'ART-AZI-500-V4',
                        specs: '300 GSM SBS BOARD, 4 COLOR OFFSET + MATTE VARNISH + DIE-CUTTING + LINE EMBOSSING',
                        specification: '300 GSM SBS BOARD, 4 COLOR OFFSET + MATTE VARNISH + DIE-CUTTING + LINE EMBOSSING',
                        construction: 'Pasting / Side Seams',
                        gsm_value: '300',
                        dimension: '105 x 45 x 125',
                        from_our_company: 'Packaging',
                        status: 'Complete',
                        progress: 'Ready',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    } as any;
                    setOrder(sampleOrder);
                } else {
                    const { data, error: sbError } = await supabase
                        .from('orders')
                        .select('*')
                        .eq('id', id)
                        .single();

                    if (sbError) throw sbError;
                    setOrder(data);
                }
            } catch (err: any) {
                console.error('Fetch error:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [id]);

    if (loading) return <div className="p-20 text-center font-bold">Loading Order #{id}...</div>;
    if (error) return <div className="p-20 text-center text-red-500 font-bold">Error: {error}</div>;
    if (!order) return <div className="p-20 text-center text-gray-500">Order not found.</div>;

    return (
        <div className="min-h-screen bg-slate-100 py-10 print:p-0 print:bg-white flex flex-col items-center">
            {/* Action Bar */}
            <div className="mb-6 flex gap-4 print:hidden">
                <button
                    onClick={() => window.print()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 shadow-lg"
                >
                    Print Document
                </button>
                <button
                    onClick={() => window.close()}
                    className="px-6 py-2 bg-white text-slate-600 rounded-full font-bold border border-slate-200 hover:bg-slate-50"
                >
                    Close
                </button>
            </div>

            <div className="bg-white shadow-2xl print:shadow-none">
                <COATemplate order={order} />
            </div>
        </div>
    );
}
