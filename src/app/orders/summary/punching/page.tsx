'use client';

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Loader2, ChevronLeft, Palette } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function PunchingSummaryContent() {
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
                        artwork_code,
                        specs
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

            const { data, error } = await query.order('id', { ascending: false });

            if (error) throw error;
            setOrders(data || []);
        } catch (err) {
            console.error('Error fetching punching summary:', err);
        } finally {
            setLoading(false);
        }
    }

    // Helper to check for specific special effects in the specs string or special_effects field
    const checkEffect = (order: any, term: string) => {
        const specs = (order.specs || order.products?.specs || '').toLowerCase();
        const effects = (order.special_effects || '').toLowerCase();
        if (specs.includes(term.toLowerCase()) || effects.includes(term.toLowerCase())) {
            return 'YES';
        }
        return '-';
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-rose-600" />
            <p className="text-slate-500 font-medium tracking-wide">Generating Punching Summary...</p>
        </div>
    );

    return (
        <div className="p-4 md:p-8 max-w-[1400px] mx-auto">
            <div className="flex items-center justify-between mb-6 print:hidden">
                <div className="flex items-center gap-4">
                    <Link href="/orders" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <ChevronLeft className="w-6 h-6 text-slate-600" />
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Palette className="w-6 h-6 text-rose-600" />
                        Punching Summary
                    </h1>
                </div>
                <button
                    onClick={() => window.print()}
                    className="bg-rose-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-rose-700 transition-colors shadow-sm"
                >
                    Print Summary
                </button>
            </div>

            <div className="overflow-x-auto bg-white rounded-xl border border-slate-300 shadow-sm">
                <table className="w-full border-collapse text-left">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-300">
                            <th className="px-4 py-3 border-r border-slate-300 text-[11px] font-black uppercase text-slate-700 w-[55px] text-center">Sr. No.</th>
                            <th className="px-4 py-3 border-r border-slate-300 text-[11px] font-black uppercase text-slate-700 min-w-[250px]">Product</th>
                            <th className="px-4 py-3 border-r border-slate-300 text-[11px] font-black uppercase text-slate-700 text-center">Print Size</th>
                            <th className="px-4 py-3 border-r border-slate-300 text-[11px] font-black uppercase text-slate-700 text-center">Print Qty</th>
                            <th className="px-4 py-3 border-r border-slate-300 text-[11px] font-black uppercase text-slate-700 text-center">Embossing</th>
                            <th className="px-4 py-3 border-r border-slate-300 text-[11px] font-black uppercase text-slate-700 text-center">Punching</th>
                            <th className="px-4 py-3 border-r border-slate-300 text-[11px] font-black uppercase text-slate-700 text-center">Pasting</th>
                            <th className="px-4 py-3 text-[11px] font-black uppercase text-slate-700 text-center">Max Del. Qty</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                        {orders.map((order, index) => (
                            <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 border-r border-slate-300 text-xs font-medium text-slate-500 text-center">{index + 1}</td>
                                <td className="px-4 py-3 border-r border-slate-300">
                                    <div className="text-xs font-bold text-slate-900">{order.products?.product_name || order.product_name}</div>
                                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{order.products?.artwork_code || order.artwork_code || '-'}</div>
                                </td>
                                <td className="px-4 py-3 border-r border-slate-300 text-xs text-slate-700 text-center">{order.print_size || '-'}</td>
                                <td className="px-4 py-3 border-r border-slate-300 text-xs font-black text-slate-900 text-center">{(order.total_print_qty || 0).toLocaleString()}</td>
                                <td className="px-4 py-3 border-r border-slate-300 text-xs font-bold text-center text-rose-600">{checkEffect(order, 'Embossing')}</td>
                                <td className="px-4 py-3 border-r border-slate-300 text-xs font-bold text-center text-indigo-600">{checkEffect(order, 'Punching')}</td>
                                <td className="px-4 py-3 border-r border-slate-300 text-xs text-slate-700 text-center">{order.pasting_type || '-'}</td>
                                <td className="px-4 py-3 text-xs font-black text-slate-900 text-center">{(order.quantity || 0).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {orders.length === 0 && (
                <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-slate-200 mt-6">
                    <p className="text-slate-400 font-medium">No active punching requirements found.</p>
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

export default function PunchingSummaryPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-rose-600" />
                <p className="text-slate-500 font-medium tracking-wide">Loading...</p>
            </div>
        }>
            <PunchingSummaryContent />
        </Suspense>
    );
}
