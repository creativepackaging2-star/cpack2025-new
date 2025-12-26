'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { Order } from '@/types';
import DeliveryLabelTemplate from '@/components/DeliveryLabelTemplate';

export default function DeliveryLabelPage() {
    const params = useParams();
    const id = params ? (params.id as string) : null;

    const [order, setOrder] = useState<Order | null>(null);
    const [selectedCompany, setSelectedCompany] = useState<'Enterprise' | 'Printers' | 'Packaging'>('Enterprise');
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
                        from_our_company: 'Enterprise',
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
                        const { data: productData } = await supabase
                            .from('products')
                            .select('*')
                            .eq('id', orderData.product_id)
                            .single();

                        if (productData) {
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

                    // Auto-select company based on 'from_our_company' if possible
                    if (orderData.from_our_company) {
                        const from = orderData.from_our_company.toLowerCase();
                        if (from.includes('printer')) setSelectedCompany('Printers');
                        else if (from.includes('pack')) setSelectedCompany('Packaging');
                        else setSelectedCompany('Enterprise');
                    }
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
            document.title = `${safeName}_DeliveryLabel`;
        }
    }, [order]);

    if (loading) return <div className="p-20 text-center font-bold">Loading Order #{id}...</div>;
    if (error) return <div className="p-20 text-center text-red-500 font-bold">Error: {error}</div>;
    if (!order) return <div className="p-20 text-center text-gray-500">Order not found.</div>;

    return (
        <div className="min-h-screen bg-slate-100 py-10 print:p-0 print:bg-white flex flex-col items-center">
            {/* Action Bar */}
            <div className="mb-6 flex gap-4 print:hidden items-center">
                {/* Company Selector */}
                <select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value as any)}
                    className="px-4 py-2 rounded-full border border-slate-300 bg-white font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="Enterprise">Creative Enterprise</option>
                    <option value="Printers">Creative Printers</option>
                    <option value="Packaging">Creative Packaging</option>
                </select>

                <button
                    onClick={() => window.print()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 shadow-lg"
                >
                    Print Label
                </button>
                <button
                    onClick={() => window.print()}
                    className="px-6 py-2 bg-emerald-600 text-white rounded-full font-bold hover:bg-emerald-700 shadow-lg"
                >
                    Save as PDF
                </button>
                <button
                    onClick={() => window.close()}
                    className="px-6 py-2 bg-white text-slate-600 rounded-full font-bold border border-slate-200 hover:bg-slate-50"
                >
                    Close
                </button>
            </div>

            <div className="bg-white shadow-2xl print:shadow-none">
                <DeliveryLabelTemplate order={order} companyType={selectedCompany} />
            </div>
        </div>
    );
}
