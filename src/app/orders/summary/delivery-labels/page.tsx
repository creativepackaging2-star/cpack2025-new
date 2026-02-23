'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { Order } from '@/types';
import DeliveryLabelTemplate from '@/components/DeliveryLabelTemplate';
import { Loader2, ChevronLeft, Printer as PrinterIcon, Download } from 'lucide-react';
import Link from 'next/link';

function DeliveryLabelsSummaryContent() {
    const searchParams = useSearchParams();
    const idsString = searchParams.get('ids');

    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedCompany, setSelectedCompany] = useState<'Enterprise' | 'Printers' | 'Packaging'>('Enterprise');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Set Document Title for traditional printing
    useEffect(() => {
        if (orders.length > 0 && orders[0].product_name) {
            const firstProductName = orders[0].product_name.replace(/[^a-zA-Z0-9]/g, '_');
            document.title = `${firstProductName}_DELIVERY_LABELS`;
        }
    }, [orders]);



    useEffect(() => {
        const fetchOrders = async () => {
            if (!idsString) {
                setLoading(false);
                return;
            }

            try {
                const ids = idsString.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
                if (ids.length === 0) {
                    setLoading(false);
                    return;
                }

                let { data: ordersData, error: sbError } = await supabase
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
                    .in('id', ids);

                if (sbError) throw sbError;

                // Process orders
                for (let orderData of ordersData || []) {
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
                }

                setOrders(ordersData || []);

                // Auto-select company based on first order's 'from_our_company' if possible
                if (ordersData && ordersData.length > 0 && ordersData[0].from_our_company) {
                    const from = ordersData[0].from_our_company.toLowerCase();
                    if (from.includes('printer')) setSelectedCompany('Printers');
                    else if (from.includes('pack')) setSelectedCompany('Packaging');
                    else setSelectedCompany('Enterprise');
                }

            } catch (err: any) {
                console.error('Fetch error:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, [idsString]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            <p className="text-slate-500 font-medium">Loading Delivery Labels...</p>
        </div>
    );

    if (error) return <div className="p-20 text-center text-red-500 font-bold">Error: {error}</div>;
    if (orders.length === 0) return <div className="p-20 text-center text-gray-500">No Orders selected.</div>;

    return (
        <div className="min-h-screen bg-slate-100 py-4 md:py-10 print:p-0 print:bg-white flex flex-col items-center print:block print:min-h-0 print:h-auto">
            {/* Action Bar */}
            <div id="action-bar-header" className="mb-6 flex flex-wrap justify-between md:justify-center w-full max-w-[1240px] px-4 gap-3 md:gap-4 print:hidden items-center">
                <Link href="/orders" className="p-2 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors">
                    <ChevronLeft className="w-5 h-5 text-slate-600" />
                </Link>

                <div className="flex flex-wrap items-center gap-2">
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

                    <button
                        onClick={() => window.print()}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-full font-bold text-sm hover:bg-indigo-700 shadow-lg active:scale-95 transition-all"
                    >
                        <PrinterIcon className="w-4 h-4" />
                        Print / Save PDF
                    </button>

                </div>
            </div>

            <div id="pdf-content-container" className="flex flex-col gap-10 print:gap-0 mx-2 md:mx-0 overflow-x-auto max-w-[1240px] w-full print:block print:max-w-none print:w-auto print:overflow-visible">
                {orders.map((order, index) => (
                    <React.Fragment key={order.id}>
                        <div
                            className="html2pdf__page-break print:h-[100vh] print:min-h-[100vh] print:m-0 print:p-0"
                            style={{
                                pageBreakAfter: 'always',
                                breakAfter: 'page'
                            }}
                        >
                            <DeliveryLabelTemplate order={order} companyType={selectedCompany} />
                        </div>
                    </React.Fragment>
                ))}
            </div>

            <style jsx global>{`
                @media print {
                    body { background: white; margin: 0; padding: 0; }
                    #action-bar-header { display: none !important; }
                    .print\\:hidden { display: none !important; }
                    .print\\:shadow-none { box-shadow: none !important; }
                    .print\\:mb-0 { margin-bottom: 0 !important; }
                    .print\\:gap-0 { gap: 0 !important; }
                    .html2pdf__page-break { 
                        display: block !important;
                        page-break-after: always !important; 
                        break-after: page !important; 
                        height: 296mm !important;
                        min-height: 296mm !important;
                        overflow: visible !important;
                    }
                }
            `}</style>
        </div>
    );
}

export default function DeliveryLabelsSummaryPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                <p className="text-slate-500 font-medium tracking-wide">Loading Labels...</p>
            </div>
        }>
            <DeliveryLabelsSummaryContent />
        </Suspense>
    );
}
