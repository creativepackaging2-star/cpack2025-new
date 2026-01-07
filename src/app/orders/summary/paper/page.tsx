'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Loader2, Truck, ChevronLeft, Package, Calendar, Layers } from 'lucide-react';
import Link from 'next/link';

import { useSearchParams } from 'next/navigation';

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

    const paperGroups = useMemo(() => {
        const groups: Record<string, any[]> = {};
        orders.forEach(order => {
            const paper = order.paper_type_name || 'Unknown Paper';
            const size = order.paper_order_size || 'No Size';
            const gsm = order.gsm_value || order.products?.actual_gsm_used || 'No GSM';
            const key = `${paper} | ${size} | ${gsm} GSM`;

            if (!groups[key]) groups[key] = [];
            groups[key].push(order);
        });
        return groups;
    }, [orders]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
            <p className="text-slate-500 font-medium tracking-wide">Calculating Paper Requirements...</p>
        </div>
    );

    return (
        <div className="space-y-8 max-w-[1200px] mx-auto pb-20 px-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-6 mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/orders" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <ChevronLeft className="w-6 h-6 text-slate-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Paper Order Summary</h1>
                        <p className="text-slate-500 text-sm">Bulk requirements grouped by paper type and size</p>
                    </div>
                </div>
                <div className="hidden sm:flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                    <Truck className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm font-bold text-emerald-700">{Object.keys(paperGroups).length} Requirements Matched</span>
                </div>
            </div>

            {Object.keys(paperGroups).length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                    <p className="text-slate-400 font-medium">No pending paper requirements found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {Object.entries(paperGroups).map(([groupKey, groupOrders]) => {
                        const totalSheets = groupOrders.reduce((sum, o) => sum + (o.paper_required || 0), 0);
                        const totalOrderQty = groupOrders.reduce((sum, o) => sum + (o.paper_order_qty || 0), 0);

                        return (
                            <div key={groupKey} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-lg">
                                <div className="p-6 bg-slate-50 border-b border-slate-100">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-100">
                                                <Layers className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-black text-slate-900 leading-tight">{groupKey}</h2>
                                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Consolidated from {groupOrders.length} orders</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mt-6">
                                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Total Needed (Calculated)</span>
                                            <span className="text-2xl font-black text-slate-900">{totalSheets.toLocaleString()}</span>
                                            <span className="ml-1 text-xs font-bold text-slate-400">Sheets</span>
                                        </div>
                                        <div className="bg-emerald-600 p-4 rounded-2xl shadow-lg shadow-emerald-100">
                                            <span className="block text-[10px] font-black text-emerald-100 uppercase tracking-tighter mb-1">To Order (Actual)</span>
                                            <span className="text-2xl font-black text-white">{totalOrderQty.toLocaleString()}</span>
                                            <span className="ml-1 text-xs font-bold text-emerald-100">Sheets</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 p-6">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Orders included in this requirement:</h3>
                                    <div className="space-y-3">
                                        {groupOrders.map((order) => (
                                            <div key={order.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group transition-all hover:bg-emerald-50 hover:border-emerald-100">
                                                <div className="flex-1 min-w-0 pr-4">
                                                    <div className="text-xs font-black text-slate-900 truncate">
                                                        {order.products?.product_name || order.product_name}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{order.order_id}</span>
                                                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                        <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-tighter">{order.printer_name || 'No Printer'}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs font-black text-slate-900">
                                                        {(order.paper_order_qty || 0).toLocaleString()}
                                                    </div>
                                                    <div className="text-[9px] font-bold text-slate-400 uppercase">Sheets</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center mt-auto">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="text-[10px] font-bold text-slate-500">Latest Delivery: {
                                            new Date(Math.max(...groupOrders.map(o => o.delivery_date ? new Date(o.delivery_date).getTime() : 0))).toLocaleDateString('en-GB')
                                        }</span>
                                    </div>
                                    <Link href="/orders" className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest">View Orders</Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
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

