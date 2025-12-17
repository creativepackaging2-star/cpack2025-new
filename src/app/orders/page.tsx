'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Order } from '@/types';
import { Search, Plus, Filter, FileText, Upload, ChevronDown, ChevronRight, Save, X } from 'lucide-react';
import Link from 'next/link';

export default function OrdersPage() {
    // Data State
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [categoryMap, setCategoryMap] = useState<Record<number, string>>({});

    // View State
    const [showCompleted, setShowCompleted] = useState(false);
    const [groupByCategory, setGroupByCategory] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Pagination State
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 50;

    // Quick Edit State
    const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
    const [editStatus, setEditStatus] = useState('');

    const STATUS_OPTIONS = [
        'Pending', 'In Production', 'Printing', 'Cutting',
        'Pasting', 'Packing', 'Ready', 'Dispatched', 'Delivered', 'Completed'
    ];

    useEffect(() => {
        fetchOrders();
    }, []); // Only fetch ONCE on mount

    async function fetchOrders() {
        setLoading(true);
        setError(null);

        // DEBUG CHECK: Env Vars
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
            setError('CRITICAL: Missing Vercel Environment Variables.');
            setLoading(false);
            return;
        }

        // 1. Fetch ALL Orders (Client-side filtering is faster for UI toggles)
        const ordersQuery = supabase
            .from('orders')
            .select(`
                *,
                products (
                    product_name, 
                    artwork_code, 
                    specs, 
                    dimension,
                    artwork_pdf, 
                    artwork_cdr, 
                    category_id
                )
            `)
            .order('created_at', { ascending: false });

        // 2. Fetch Categories Separately
        const categoriesQuery = supabase.from('category').select('id, name');

        const [ordersRes, categoriesRes] = await Promise.all([
            ordersQuery,
            categoriesQuery
        ]);

        if (ordersRes.error) {
            console.error('Error fetching orders:', ordersRes.error);
            setError(ordersRes.error.message);
        } else {
            setOrders(ordersRes.data || []);
        }

        if (categoriesRes.data) {
            const map: Record<number, string> = {};
            categoriesRes.data.forEach((c: any) => map[c.id] = c.name);
            setCategoryMap(map);
        }

        setLoading(false);
    }

    const handleQuickUpdate = async (id: number) => {
        if (!editStatus) return;

        const { error } = await supabase
            .from('orders')
            .update({ status: editStatus })
            .eq('id', id);

        if (error) {
            alert('Error updating status: ' + error.message);
        } else {
            // Optimistic update
            setOrders(prev => prev.map(o => o.id === id ? { ...o, status: editStatus } : o));
            setEditingOrderId(null);
        }
    };

    const toggleQuickEdit = (order: Order) => {
        if (editingOrderId === order.id) {
            setEditingOrderId(null);
        } else {
            setEditingOrderId(order.id);
            setEditStatus(order.status || 'Pending');
        }
    };

    // Derived State: Filtered & Grouped (Memoized)
    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            // 1. Filter by Status (Client-side)
            if (!showCompleted) {
                const s = order.status?.toLowerCase().trim() || '';
                // Hide if Completed or Delivered
                if (s === 'completed' || s === 'delivered') return false;
            }

            // 2. Filter by Search
            if (!searchTerm) return true;
            const search = searchTerm.toLowerCase();
            const pName = order.products?.product_name?.toLowerCase() || '';
            const oId = order.order_id?.toLowerCase() || '';
            const printer = order.printer_name?.toLowerCase() || '';
            return pName.includes(search) || oId.includes(search) || printer.includes(search);
        });
    }, [orders, searchTerm, showCompleted]);

    // Reset page when filter changes
    useEffect(() => {
        setPage(1);
    }, [searchTerm, groupByCategory, showCompleted]);

    const paginatedOrders = useMemo(() => {
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return filteredOrders.slice(startIndex, endIndex);
    }, [filteredOrders, page, ITEMS_PER_PAGE]);


    const groupedOrders = useMemo(() => {
        return groupByCategory
            ? paginatedOrders.reduce((groups: Record<string, any[]>, order) => {
                const catId = order.products?.category_id;
                const catName = (catId && categoryMap[catId]) ? categoryMap[catId] : 'Uncategorized';

                if (!groups[catName]) groups[catName] = [];
                groups[catName].push(order);
                return groups;
            }, {})
            : { 'All Orders': paginatedOrders };
    }, [groupByCategory, paginatedOrders, categoryMap]);

    const getStatusColor = (status: string | null) => {
        const s = status?.toLowerCase() || '';
        if (s.includes('complete') || s.includes('delivered')) return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
        if (s.includes('pending')) return 'bg-amber-50 text-amber-700 ring-amber-600/20';
        if (s.includes('production') || s.includes('print')) return 'bg-blue-50 text-blue-700 ring-blue-600/20';
        return 'bg-slate-50 text-slate-600 ring-slate-500/10';
    };

    const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
            {/* DEBUG ALERT (Kept minimal just in case, but can be removed if user confirmed data) */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                    <strong className="font-bold">Error: </strong> {error}
                </div>
            )}

            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                    Production Orders
                    <span className="ml-2 text-sm font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{filteredOrders.length}</span>
                </h2>
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 select-none">
                        <input
                            type="checkbox"
                            checked={showCompleted}
                            onChange={e => setShowCompleted(e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        Show Completed
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 select-none">
                        <input
                            type="checkbox"
                            checked={groupByCategory}
                            onChange={e => setGroupByCategory(e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        Group by Category
                    </label>
                    <Link href="/products" className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm">
                        <Plus className="mr-2 h-4 w-4" />
                        New Order
                    </Link>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search by Product Name, Order ID, or Printer..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Orders Table */}
            <div className="space-y-6">
                {loading ? (
                    <div className="text-center py-12 text-slate-500">Loading orders...</div>
                ) : Object.keys(groupedOrders).length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200 border-dashed">
                        No active orders found.
                    </div>
                ) : (
                    <>
                        {(Object.entries(groupedOrders) as [string, any[]][]).map(([category, catOrders]) => (
                            <div key={category} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                {groupByCategory && (
                                    <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center gap-2">
                                        <h3 className="font-semibold text-slate-800">{category}</h3>
                                        <span className="text-xs font-medium text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">{catOrders.length}</span>
                                    </div>
                                )}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm text-slate-600">
                                        <thead className="bg-white text-xs uppercase text-slate-500 border-b border-slate-100">
                                            <tr>
                                                <th className="px-6 py-3 font-semibold w-[25%]">Product Info</th>
                                                <th className="px-6 py-3 font-semibold w-[10%]">Qty</th>
                                                <th className="px-6 py-3 font-semibold w-[15%]">Status</th>
                                                <th className="px-6 py-3 font-semibold w-[20%]">Specs</th>
                                                <th className="px-6 py-3 font-semibold w-[10%]">Total Print</th>
                                                <th className="px-6 py-3 font-semibold w-[15%]">Files</th>
                                                <th className="px-6 py-3 font-semibold text-right w-[5%]">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {catOrders.map((order) => (
                                                <tr key={order.id} className="hover:bg-slate-50/80 transition-colors group">

                                                    {/* 1. Product Info */}
                                                    <td className="px-6 py-4 align-top">
                                                        <div className="font-bold text-slate-900">{order.products?.product_name || 'Unknown Product'}</div>
                                                        <div className="text-xs text-slate-500 font-mono mt-0.5">{order.products?.artwork_code || '-'}</div>
                                                        <div className="flex gap-2 mt-1.5 opacity-90 transition-opacity">
                                                            {order.products?.artwork_pdf && (
                                                                <a href={`/uploads/${order.products.artwork_pdf}`} target="_blank" className="text-red-500 hover:text-red-700 flex items-center text-[10px] font-medium bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                                                                    <FileText className="w-3 h-3 mr-1" /> PDF
                                                                </a>
                                                            )}
                                                            {order.products?.artwork_cdr && (
                                                                <a href={`/uploads/${order.products.artwork_cdr}`} target="_blank" className="text-blue-500 hover:text-blue-700 flex items-center text-[10px] font-medium bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                                                    <Upload className="w-3 h-3 mr-1" /> CDR
                                                                </a>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* 2. Quantity */}
                                                    <td className="px-6 py-4 align-top font-mono font-medium text-slate-700">
                                                        {order.quantity?.toLocaleString() || '-'}
                                                    </td>

                                                    {/* 3. Process (Quick Edit) */}
                                                    <td className="px-6 py-4 align-top">
                                                        {editingOrderId === order.id ? (
                                                            <div className="flex items-center gap-1">
                                                                <select
                                                                    value={editStatus}
                                                                    onChange={e => setEditStatus(e.target.value)}
                                                                    className="text-xs border border-slate-300 rounded px-2 py-1 w-full"
                                                                    autoFocus
                                                                >
                                                                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                                                </select>
                                                                <button onClick={() => handleQuickUpdate(order.id)} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded"><Save className="w-4 h-4" /></button>
                                                                <button onClick={() => setEditingOrderId(null)} className="text-slate-400 hover:bg-slate-100 p-1 rounded"><X className="w-4 h-4" /></button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => toggleQuickEdit(order)}
                                                                className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(order.status)} hover:ring-opacity-50 transition-all`}
                                                            >
                                                                {order.status || 'Pending'}
                                                                <ChevronDown className="ml-1 h-3 w-3 opacity-50" />
                                                            </button>
                                                        )}
                                                    </td>

                                                    {/* 4. Specs */}
                                                    <td className="px-6 py-4 align-top">
                                                        <div className="text-xs text-slate-600 leading-relaxed max-h-[80px] overflow-y-auto scrollbar-thin whitespace-pre-wrap">
                                                            {order.products?.specs || '-'}
                                                        </div>
                                                        {(!order.products?.specs || order.products?.specs === '-') && order.products?.dimension && (
                                                            <div className="text-[10px] text-slate-400 mt-1">
                                                                Dim: {order.products.dimension}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* 5. Total Print Qty */}
                                                    <td className="px-6 py-4 align-top font-mono text-xs">
                                                        {order.total_print_qty?.toLocaleString() || '-'}
                                                    </td>

                                                    {/* 6. Files */}
                                                    <td className="px-6 py-4 align-top">
                                                        <div className="space-y-1">
                                                            {order.coa_file && <div className="text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 inline-block mr-1">COA</div>}
                                                            {order.del_label_file && <div className="text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 inline-block mr-1">Label</div>}
                                                            {order.shade_card_file && <div className="text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 inline-block">Shade</div>}
                                                            {(!order.coa_file && !order.del_label_file && !order.shade_card_file) && <span className="text-slate-300 text-xs">-</span>}
                                                        </div>
                                                    </td>

                                                    {/* 7. Action */}
                                                    <td className="px-6 py-4 align-top text-right">
                                                        <Link href={`/orders/${order.id}`} className="text-indigo-600 hover:text-indigo-900 text-xs font-medium border border-indigo-200 rounded px-2 py-1 hover:bg-indigo-50">
                                                            Edit
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center space-x-2 pt-6">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-3 py-1 bg-white border border-slate-300 rounded text-sm disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <span className="text-sm text-slate-600">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-3 py-1 bg-white border border-slate-300 rounded text-sm disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
