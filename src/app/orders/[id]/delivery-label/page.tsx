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
                        invoice_no: 'CP/2245/25',
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
                        .select(`
                            *,
                            products (
                                id,
                                product_name,
                                artwork_code,
                                delivery_address_id
                            )
                        `)
                        .eq('id', id)
                        .single();

                    if (sbError) throw sbError;

                    // Fallback logic for missing data & LIVE OVERRIDES
                    if (orderData.products) {
                        const p = orderData.products;

                        // Live Master Data Overrides
                        if (p.product_name) orderData.product_name = p.product_name;
                        if (p.artwork_code) orderData.artwork_code = p.artwork_code;

                        if (!orderData.delivery_address && p.delivery_address_id) {
                            const { data: addressData } = await supabase
                                .from('delivery_addresses')
                                .select('name')
                                .eq('id', p.delivery_address_id)
                                .single();

                            if (addressData) {
                                orderData.delivery_address = addressData.name;
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
        <div className="min-h-screen bg-slate-100 py-4 md:py-10 print:p-0 print:bg-white flex flex-col items-center print:block">
            {/* Action Bar */}
            <div className="mb-6 flex flex-wrap justify-center gap-3 md:gap-4 print:hidden items-center px-4 max-w-full">
                {/* Company Selector */}
                <select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value as any)}
                    className="w-full sm:w-auto px-4 py-2 rounded-full border border-slate-300 bg-white font-bold text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="Enterprise">Creative Enterprise</option>
                    <option value="Printers">Creative Printers</option>
                    <option value="Packaging">Creative Packaging</option>
                </select>

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
                <DeliveryLabelTemplate order={order} companyType={selectedCompany} />
            </div>
        </div>
    );
}
