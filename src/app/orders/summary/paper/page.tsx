'use client';

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Loader2, ChevronLeft, Truck } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function PaperSummaryContent() {
    const searchParams = useSearchParams();
    const idsString = searchParams.get('ids');
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrders();
    }, [idsString]);

    async function fetchOrders() {
        setLoading(true);
        try {
            let query = supabase
                .from('orders')
                .select(`
                    *,
                    products (
                        product_name,
                        actual_gsm_used
                    )
                `);

            if (idsString) {
                const ids = idsString.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
                if (ids.length > 0) {
                    query = query.in('id', ids);
                }
            } else {
                query = query.neq('status', 'Complete');
            }

            const { data, error } = await query.order('paper_type_name', { ascending: true });

            if (error) throw error;
            setOrders(data || []);
        } catch (err) {
            console.error('Error fetching paper summary:', err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
            <p className="text-slate-500 font-medium">Calculating Paper Requirements...</p>
        </div>
    );

    return (
        <div className="p-4 md:p-8 max-w-[1200px] mx-auto font-montserrat">
            <div className="flex items-center justify-between mb-6 print:hidden">
                <div className="flex items-center gap-4">
                    <Link href="/orders" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <ChevronLeft className="w-6 h-6 text-slate-600" />
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Truck className="w-6 h-6 text-emerald-600" />
                        Paper Order Summary
                    </h1>
                </div>
                <button
                    onClick={() => window.print()}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-emerald-700 transition-colors shadow-sm"
                >
                    Print Summary
                </button>
            </div>

            <div className="overflow-x-auto bg-white rounded-xl border border-slate-300 shadow-sm">
                <table className="w-full border-collapse text-left">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-300">
                            <th className="px-4 py-3 border-r border-slate-300 text-[11px] font-normal uppercase text-slate-700 w-[50px] text-center">Sr. No.</th>
                            <th className="px-4 py-3 border-r border-slate-300 text-[11px] font-normal uppercase text-slate-700 w-[80px] text-center">GSM</th>
                            <th className="px-4 py-3 border-r border-slate-300 text-[11px] font-normal uppercase text-slate-700">Paper</th>
                            <th className="px-4 py-3 border-r border-slate-300 text-[11px] font-normal uppercase text-slate-700 text-center">Paper ord</th>
                            <th className="px-4 py-3 border-r border-slate-300 text-[11px] font-normal uppercase text-slate-700 text-center">Paper Ord</th>
                            <th className="px-4 py-3 border-r border-slate-300 text-[11px] font-normal uppercase text-slate-700">Printer (w)</th>
                            <th className="px-4 py-3 text-[11px] font-normal uppercase text-slate-700 text-center">Product Prefix</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                        {orders.map((order, index) => (
                            <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 border-r border-slate-300 text-xs font-normal text-slate-500 text-center">{index + 1}</td>
                                <td className="px-4 py-3 border-r border-slate-300 text-xs font-normal text-slate-700 text-center">{order.gsm_value || order.products?.actual_gsm_used || '-'}</td>
                                <td className="px-4 py-3 border-r border-slate-300 text-xs font-normal text-slate-900">{order.paper_type_name || '-'}</td>
                                <td className="px-4 py-3 border-r border-slate-300 text-xs font-normal text-slate-700 text-center">{order.paper_order_size || '-'}</td>
                                <td className="px-4 py-3 border-r border-slate-300 text-xs font-semibold text-emerald-600 text-center">{(order.paper_order_qty || 0).toLocaleString()}</td>
                                <td className="px-4 py-3 border-r border-slate-100 text-xs font-normal text-slate-700">{order.printer_name || '-'}</td>
                                <td className="px-4 py-3 text-xs font-semibold text-indigo-600 text-center uppercase tracking-widest whitespace-nowrap">
                                    {(order.products?.product_name || order.product_name || '').substring(0, 3)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {orders.length === 0 && (
                <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-slate-200 mt-6">
                    <p className="text-slate-400 font-medium">No pending paper requirements found.</p>
                </div>
            )}

            <style jsx global>{`
                @media print {
                    @page { margin: 1cm; }
                    body { background: white; }
                    .print\\:hidden { display: none !important; }
                    table { border-collapse: collapse !important; border: 1px solid #333 !important; }
                    th, td { border: 1px solid #333 !important; }
                    th { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; }
                }
            `}</style>
        </div>
    );
}

export default function PaperSummaryPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
                <p className="text-slate-500 font-medium tracking-wide">Loading...</p>
            </div>
        }>
            <PaperSummaryContent />
        </Suspense>
    );
}
