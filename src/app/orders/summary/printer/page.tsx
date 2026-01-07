'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Order } from '@/types';
import { Loader2, Printer, ChevronLeft, Calendar, User } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function PrinterSummaryContent() {
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

            const { data, error } = await query.order('delivery_date', { ascending: true });

            if (error) throw error;
            setOrders(data || []);
        } catch (err) {
            console.error('Error fetching summary:', err);
        } finally {
            setLoading(false);
        }
    }

    const groupedByPrinter = useMemo(() => {
        return orders.reduce((groups: Record<string, any[]>, order) => {
            const printer = order.printer_name || 'Unassigned';
            if (!groups[printer]) groups[printer] = [];
            groups[printer].push(order);
            return groups;
        }, {});
    }, [orders]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            <p className="text-slate-500 font-medium tracking-wide">Generating Printer Summary...</p>
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
                        <h1 className="text-2xl font-bold text-slate-900">Printer Summary</h1>
                        <p className="text-slate-500 text-sm">Active orders grouped by assigned printer</p>
                    </div>
                </div>
                <div className="hidden sm:flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                    <Printer className="w-5 h-5 text-indigo-600" />
                    <span className="text-sm font-bold text-indigo-700">{Object.keys(groupedByPrinter).length} Printers Active</span>
                </div>
            </div>

            {Object.keys(groupedByPrinter).length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                    <p className="text-slate-400 font-medium">No active orders found for any printer.</p>
                </div>
            ) : (
                <div className="space-y-12">
                    {Object.entries(groupedByPrinter).map(([printer, printerOrders]) => (
                        <div key={printer} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
                            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900">{printer}</h2>
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{printerOrders.length} Pending Orders</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Total Quantity</p>
                                        <p className="text-sm font-black text-slate-900">
                                            {printerOrders.reduce((sum, o) => sum + (o.quantity || 0), 0).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50/30 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                            <th className="px-6 py-4">Job Info</th>
                                            <th className="px-6 py-4 text-center">Batch / ID</th>
                                            <th className="px-6 py-4 text-center">Quantity</th>
                                            <th className="px-6 py-4 text-center">Paper</th>
                                            <th className="px-6 py-4 text-center">Delivery Date</th>
                                            <th className="px-6 py-4 text-center">Progress</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {printerOrders.map((order) => (
                                            <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                                        {order.products?.product_name || order.product_name}
                                                    </div>
                                                    <div className="text-[10px] font-bold text-slate-400 mt-1 flex items-center gap-2">
                                                        <span className="bg-slate-100 px-1.5 py-0.5 rounded uppercase">{order.products?.artwork_code || order.artwork_code || 'No Code'}</span>
                                                        <span>{order.print_size || '-'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded inline-block">
                                                        {order.batch_no || '-'}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 mt-1 font-medium">{order.order_id}</div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="text-sm font-black text-slate-900">{(order.quantity || 0).toLocaleString()}</div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="text-xs font-bold text-slate-700">{order.paper_type_name || '-'}</div>
                                                    <div className="text-[10px] text-slate-400 mt-0.5">{order.gsm_value || order.products?.actual_gsm_used || '-'} GSM</div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <Calendar className="w-3.5 h-3.5 text-slate-300 mb-1" />
                                                        <span className="text-xs font-bold text-slate-600">{order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-GB') : '-'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter ${order.progress?.toLowerCase().includes('ready') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                                        order.progress?.toLowerCase().includes('printing') ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                                            'bg-amber-50 text-amber-700 border border-amber-100'
                                                        }`}>
                                                        {order.progress || 'Pending'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function PrinterSummaryPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                <p className="text-slate-500 font-medium tracking-wide">Loading...</p>
            </div>
        }>
            <PrinterSummaryContent />
        </Suspense>
    );
}

