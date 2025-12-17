'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Order } from '@/types';
import { Search, Plus, Filter, MoreHorizontal, Calendar, Truck } from 'lucide-react';

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 50;
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        fetchOrders();
    }, [page, searchTerm]);

    async function fetchOrders() {
        setLoading(true);
        let query = supabase
            .from('orders')
            .select('*', { count: 'exact' });

        if (searchTerm) {
            // Search by Order ID or Printer Name
            query = query.or(`order_id.ilike.%${searchTerm}%,printer_name.ilike.%${searchTerm}%`);
        }

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        // Order by created_at desc to show newest first
        const { data, count, error } = await query
            .range(from, to)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching orders:', error);
        } else {
            setOrders((data as Order[]) || []);
            setTotalCount(count || 0);
        }
        setLoading(false);
    }

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setPage(1);
    };

    const getStatusColor = (status: string | null) => {
        const s = status?.toLowerCase() || '';
        if (s.includes('complete') || s.includes('delivered')) return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
        if (s.includes('pending')) return 'bg-amber-50 text-amber-700 ring-amber-600/20';
        if (s.includes('process') || s.includes('print')) return 'bg-blue-50 text-blue-700 ring-blue-600/20';
        return 'bg-slate-50 text-slate-600 ring-slate-500/10';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Orders</h2>
                <button className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors">
                    <Plus className="mr-2 h-4 w-4" />
                    New Order
                </button>
            </div>

            <div className="flex items-center space-x-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search orders..."
                        className="w-full rounded-md border border-slate-300 bg-transparent py-2 pl-9 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                </div>
                <button className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                            <tr>
                                <th className="px-6 py-3 font-semibold">Order ID</th>
                                <th className="px-6 py-3 font-semibold">Date</th>
                                <th className="px-6 py-3 font-semibold">Printer</th>
                                <th className="px-6 py-3 font-semibold">Status</th>
                                <th className="px-6 py-3 font-semibold">Qty</th>
                                <th className="px-6 py-3 font-semibold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500 animate-pulse">
                                        Loading orders...
                                    </td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                        No orders found.
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900">
                                            {order.order_id || `#${order.id}`}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                                {order.order_date || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">{order.printer_name || '-'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(order.status)}`}>
                                                {order.status || 'Unknown'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono">{order.quantity?.toLocaleString() || '-'}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-slate-400 hover:text-slate-600">
                                                <MoreHorizontal className="h-5 w-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
                    <p className="text-sm text-slate-500">
                        Showing <span className="font-medium">{Math.min((page - 1) * pageSize + 1, totalCount)}</span> to{' '}
                        <span className="font-medium">{Math.min(page * pageSize, totalCount)}</span> of{' '}
                        <span className="font-medium">{totalCount}</span> results
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="rounded-md border border-slate-300 px-3 py-1 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={page * pageSize >= totalCount}
                            className="rounded-md border border-slate-300 px-3 py-1 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
