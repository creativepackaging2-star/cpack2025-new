'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { Order } from '@/types';
import ShadeCardTemplate from '@/components/ShadeCardTemplate';

export default function ShadeCardPage() {
    const params = useParams();
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
                        artwork_code: 'ART-AZI-500-V4',
                        dimension: '105 x 45 x 125',
                        gsm_value: '300',
                        specification: '300 GSM SBS BOARD, 4 COLOR OFFSET + MATTE VARNISH + DIE-CUTTING + LINE EMBOSSING',
                        construction: 'Pasting / Side Seams',
                        status: 'Complete',
                        progress: 'Ready',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    } as any;
                    setOrder(sampleOrder);
                } else {
                    let { data: orderData, error: sbError } = await supabase
                        .from('orders')
                        .select('*')
                        .eq('id', id)
                        .single();

                    if (sbError) throw sbError;

                    // Fallback logic for missing data
                    if (orderData.product_id) {
                        const { data: productData, error: pError } = await supabase
                            .from('products')
                            .select(`
                                *,
                                pasting:pasting_types(name),
                                construction:construction_types(name),
                                category:categories(name)
                            `)
                            .eq('id', orderData.product_id)
                            .single();

                        if (productData) {
                            // Map construction and pasting if missing in order
                            if (!orderData.construction_type) orderData.construction_type = productData.construction?.name;
                            if (!orderData.pasting_type) orderData.pasting_type = productData.pasting?.name;
                            if (!orderData.category_name) orderData.category_name = productData.category?.name;
                            if (!orderData.artwork_code) orderData.artwork_code = productData.artwork_code;
                            if (!orderData.gsm_value) orderData.gsm_value = productData.gsm_value; // fallback
                            if (!orderData.dimension) orderData.dimension = productData.dimension; // fallback

                            // Fill missing delivery address
                            if (!orderData.delivery_address && productData.delivery_address_id) {
                                const { data: addressData } = await supabase
                                    .from('delivery_addresses')
                                    .select('name')
                                    .eq('id', productData.delivery_address_id)
                                    .single();

                                if (addressData) {
                                    orderData.delivery_address = addressData.name;
                                }
                            }
                        }
                    }

                    setOrder(orderData);
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

    useEffect(() => {
        if (order && order.product_name) {
            const safeName = order.product_name.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
            document.title = `${safeName}_ShadeCard`;
        }
    }, [order]);

    if (loading) return <div className="p-20 text-center font-bold">Loading Order #{id}...</div>;
    if (error) return <div className="p-20 text-center text-red-500 font-bold">Error: {error}</div>;
    if (!order) return <div className="p-20 text-center text-gray-500">Order not found.</div>;

    return (
        <div className="min-h-screen bg-slate-100 py-4 md:py-10 print:p-0 print:bg-white flex flex-col items-center">
            {/* Action Bar */}
            <div className="mb-6 flex flex-wrap justify-center gap-3 md:gap-4 print:hidden items-center px-4 max-w-full">
                <div className="flex flex-wrap justify-center gap-2">
                    <button
                        onClick={() => window.print()}
                        className="flex-1 sm:flex-none px-6 py-2 bg-blue-600 text-white rounded-full font-bold text-sm hover:bg-blue-700 shadow-lg active:scale-95 transition-all"
                    >
                        Print
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="flex-1 sm:flex-none px-6 py-2 bg-emerald-600 text-white rounded-full font-bold text-sm hover:bg-emerald-700 shadow-lg active:scale-95 transition-all"
                    >
                        PDF
                    </button>
                    <button
                        onClick={() => window.close()}
                        className="px-6 py-2 bg-white text-slate-600 rounded-full font-bold text-sm border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>

            <div className="bg-white shadow-2xl print:shadow-none mx-2 md:mx-0 overflow-x-auto max-w-full">
                <ShadeCardTemplate order={order} />
            </div>
        </div>
    );
}
