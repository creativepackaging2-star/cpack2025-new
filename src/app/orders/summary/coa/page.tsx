'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { Order } from '@/types';
import COATemplate from '@/components/COATemplate';
import { Loader2, ChevronLeft, Printer as PrinterIcon, Download } from 'lucide-react';
import Link from 'next/link';

function COASummaryContent() {
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
            document.title = `${firstProductName}_COA`;
        }
    }, [orders]);

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
                            dimension,
                            folding,
                            folding_dim,
                            delivery_address_id,
                            ink,
                            plate_no,
                            coating,
                            special_effects,
                            specs,
                            artwork_pdf,
                            artwork_cdr,
                            specifications!fk_specification (name),
                            pasting!fk_pasting (name),
                            constructions!fk_construction (name),
                            gsm!fk_gsm (name),
                            paper_types!fk_paper_type (name),
                            sizes!fk_size (name)
                        )
                    `)
                    .in('id', ids);

                if (sbError) throw sbError;

                // Process orders
                for (let orderData of ordersData || []) {
                    if (orderData.products) {
                        const p = orderData.products;

                        // LIVE OVERRIDES from Product Master
                        if (p.product_name) orderData.product_name = p.product_name;
                        if (p.dimension) orderData.dimension = p.dimension;
                        if (p.artwork_code) orderData.artwork_code = p.artwork_code;
                        if (p.ink) orderData.ink = p.ink;
                        if (p.plate_no) orderData.plate_no = p.plate_no;
                        if (p.coating) orderData.coating = p.coating;
                        if (p.special_effects) orderData.special_effects = p.special_effects;
                        if (p.specs) orderData.specs = p.specs;

                        // Linked Tables Overrides
                        if (p.specifications?.name) orderData.specification = p.specifications.name;
                        if (p.pasting?.name) orderData.pasting_type = p.pasting.name;
                        if (p.constructions?.name) orderData.construction_type = p.constructions.name;
                        if (p.gsm?.name) orderData.gsm_value = p.gsm.name;
                        if (p.paper_types?.name) orderData.paper_type_name = p.paper_types.name;
                        if (p.sizes?.name) orderData.print_size = p.sizes.name;

                        // Fill missing folding info
                        if (!orderData.folding) orderData.folding = p.folding;
                        if (!orderData.folding_dim) orderData.folding_dim = p.folding_dim;

                        // Fill missing delivery address
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

                    // Force batch no calculation if missing but we have what we need
                    if (!orderData.batch_no && orderData.product_name && orderData.delivery_date) {
                        orderData.batch_no = calculateBatchNo(orderData.product_name, orderData.category_name || '', orderData.delivery_date);
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
            <p className="text-slate-500 font-medium">Loading COAs...</p>
        </div>
    );

    if (error) return <div className="p-20 text-center text-red-500 font-bold">Error: {error}</div>;
    if (orders.length === 0) return <div className="p-20 text-center text-gray-500">No Orders selected.</div>;

    return (
        <div className="min-h-screen bg-slate-100 py-4 md:py-10 print:p-0 print:bg-white flex flex-col items-center print:block print:min-h-0 print:h-auto">
            {/* Action Bar */}
            <div className="mb-6 flex flex-wrap justify-between md:justify-center w-full max-w-[1240px] px-4 gap-3 md:gap-4 print:hidden items-center">
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
                        <div className="coa-capture-wrapper bg-white shadow-2xl print:shadow-none mb-8 print:mb-0 html2pdf__page-break" style={{ pageBreakAfter: index === orders.length - 1 ? 'auto' : 'always' }}>
                            <COATemplate order={order} companyType={selectedCompany} />
                        </div>
                    </React.Fragment>
                ))}
            </div>

            <style jsx global>{`
                @media print {
                    body { background: white; margin: 0; padding: 0; }
                    .print\\:hidden { display: none !important; }
                    .print\\:shadow-none { box-shadow: none !important; }
                    .print\\:mb-0 { margin-bottom: 0 !important; }
                    .print\\:gap-0 { gap: 0 !important; }
                    .html2pdf__page-break { 
                        page-break-after: always !important; 
                        break-after: page !important; 
                    }
                }
            `}</style>
        </div>
    );
}

export default function COASummaryPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                <p className="text-slate-500 font-medium tracking-wide">Loading COAs...</p>
            </div>
        }>
            <COASummaryContent />
        </Suspense>
    );
}
