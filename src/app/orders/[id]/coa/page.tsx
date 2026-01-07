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
    const [selectedCompany, setSelectedCompany] = useState<'Enterprise' | 'Printers' | 'Packaging'>('Enterprise');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Helper to generate batch no if missing
    const generateBatchNoFromDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yy = String(date.getFullYear()).slice(-2);
        return `${dd}${mm}${yy}`;
    };

    const calculateBatchNo = (pName: string, cName: string, dDate: string) => {
        const datePart = generateBatchNoFromDate(dDate);
        if (!datePart) return '';
        const namePart = (pName || '').replace(/\s+/g, '').substring(0, 6).toUpperCase();
        const catPart = (cName || 'X').substring(0, 1).toUpperCase();
        return `${namePart}${datePart}${catPart}`;
    };

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
                        artwork_code: 'ART-AZI-500-V4',
                        specs: '300 GSM SBS BOARD, 4 COLOR OFFSET + MATTE VARNISH + DIE-CUTTING + LINE EMBOSSING',
                        specification: '300 GSM SBS BOARD, 4 COLOR OFFSET + MATTE VARNISH + DIE-CUTTING + LINE EMBOSSING',
                        construction: 'Pasting / Side Seams',
                        gsm_value: '300',
                        dimension: '105 x 45 x 125',
                        from_our_company: 'Packaging',
                        status: 'Complete',
                        progress: 'Ready',
                        category_name: 'Inserts',
                        folding_dimension: '(100 x 50)',
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
                        // 1. Fetch Product details if folding/address info is missing
                        const { data: productData } = await supabase
                            .from('products')
                            .select('*')
                            .eq('id', orderData.product_id)
                            .single();

                        if (productData) {
                            // Fill missing folding info
                            if (!orderData.folding) orderData.folding = productData.folding;
                            if (!orderData.folding_dim) orderData.folding_dim = productData.folding_dim;

                            // Fill missing delivery address
                            if (!orderData.delivery_address && productData.delivery_address_id) {
                                const { data: addressData } = await supabase
                                    .from('delivery_addresses')
                                    .select('name') // Assuming 'name' is the address field based on debug output
                                    .eq('id', productData.delivery_address_id)
                                    .single();

                                if (addressData) {
                                    orderData.delivery_address = addressData.name;
                                }
                            }
                        }
                    }

                    // Force batch no calculation if missing but we have what we need
                    if (!orderData.batch_no && orderData.product_name && orderData.delivery_date) {
                        orderData.batch_no = calculateBatchNo(orderData.product_name, orderData.category_name || '', orderData.delivery_date);
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
            // Sanitize filename to be safe
            const safeName = order.product_name.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
            document.title = `${safeName}.COA`;
        }
    }, [order]);

    if (loading) return <div className="p-20 text-center font-bold">Loading Order #{id}...</div>;
    if (error) return <div className="p-20 text-center text-red-500 font-bold">Error: {error}</div>;
    if (!order) return <div className="p-20 text-center text-gray-500">Order not found.</div>;

    return (
        <div className="min-h-screen bg-slate-100 py-4 md:py-10 print:p-0 print:bg-white flex flex-col items-center">
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
                <COATemplate order={order} companyType={selectedCompany} />
            </div>
        </div>
    );
}
