'use client';

import { useEffect, useState, useMemo, Fragment, useTransition, memo, useCallback } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Order } from '@/types';
import { Search, Plus, FileText, ChevronDown, ChevronRight, Save, X, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

// --- Memoized Components for Performance ---

const DocBadge = memo(({ label }: { label: string }) => (
    <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-1 rounded text-[10px] font-bold">
        {label}
    </span>
));
DocBadge.displayName = 'DocBadge';

const DetailGroup = memo(({ title, items }: { title: string, items: { label: string, value: any }[] }) => (
    <div className="space-y-3">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</h4>
        <div className="space-y-2">
            {items.map((it, i) => (
                <div key={i} className="flex justify-between text-xs border-b border-slate-100 pb-1">
                    <span className="text-slate-500">{it.label}</span>
                    <span className="font-semibold text-slate-800">{it.value || '-'}</span>
                </div>
            ))}
        </div>
    </div>
));
DetailGroup.displayName = 'DetailGroup';

const OrderGroup = memo(({ category, catOrders, expandedOrderId, toggleRow, handleMarkComplete, toggleQuickEdit, isUpdating, editingOrderId, editProgress, setEditProgress, handleQuickUpdate }: any) => {
    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm mb-8">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-800">{category}</h3>
                <span className="text-xs font-medium text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                    {catOrders.length}
                </span>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 w-[40px]"></th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Job / Date</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Product</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">Qty / Rate</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Process</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                        {catOrders.map((order: any) => (
                            <OrderRow
                                key={order.id}
                                order={order}
                                isExpanded={expandedOrderId === order.id}
                                toggleRow={toggleRow}
                                handleMarkComplete={handleMarkComplete}
                                toggleQuickEdit={toggleQuickEdit}
                                isUpdating={isUpdating === order.id}
                                isEditing={editingOrderId === order.id}
                                editProgress={editProgress}
                                setEditProgress={setEditProgress}
                                handleQuickUpdate={handleQuickUpdate}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
});
OrderGroup.displayName = 'OrderGroup';

const PROCESS_OPTIONS = [
    'Paper', 'Plate', 'Print', 'Varnish', 'Foil', 'Pasting', 'Folding', 'Ready', 'Hold'
];

const getProgressColor = (progress: string | null) => {
    const s = progress?.toLowerCase() || '';
    if (s === 'ready') return 'bg-emerald-100 text-emerald-800 ring-emerald-600/20 font-bold';
    if (s === 'hold') return 'bg-red-100 text-red-800 ring-red-600/20 font-bold';
    if (['paper', 'plate', 'print', 'varnish', 'foil', 'pasting', 'folding'].some(p => s.includes(p))) {
        return 'bg-blue-50 text-blue-700 ring-blue-600/20';
    }
    return 'bg-slate-50 text-slate-600 ring-slate-500/10';
};

const OrderRow = memo(({
    order,
    isExpanded,
    toggleRow,
    handleMarkComplete,
    toggleQuickEdit,
    isUpdating,
    isEditing,
    editProgress,
    setEditProgress,
    handleQuickUpdate,
}: any) => {
    const [confirming, setConfirming] = useState(false);
    const s = order.progress?.toLowerCase() || '';

    // Row style based on progress, matching Product Page layout but keeping highlights
    const baseRowClass = isExpanded ? 'bg-indigo-50/30' : 'hover:bg-slate-50 transition-colors cursor-pointer';
    let rowClassName = baseRowClass;
    if (s === 'hold') rowClassName = `${baseRowClass} bg-red-50/50`;
    if (s === 'ready') rowClassName = `${baseRowClass} bg-emerald-50/50`;

    const onCompleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirming) {
            setConfirming(true);
            setTimeout(() => setConfirming(false), 3000);
        } else {
            handleMarkComplete(order.id);
            setConfirming(false);
        }
    };

    return (
        <Fragment>
            <tr className={rowClassName} onClick={() => toggleRow(order.id)}>
                <td className="px-6 py-4">
                    <button className="p-1 hover:bg-slate-200 rounded-md transition-colors">
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-indigo-600" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    </button>
                </td>

                {/* 1. Job / Date */}
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-slate-900">{order.order_id || 'N/A'}</div>
                    <div className="text-xs text-slate-500">{order.order_date || '-'}</div>
                </td>

                {/* 2. Product */}
                <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-slate-900 line-clamp-1">{order.products?.product_name || order.product_sku || 'Untitled Product'}</div>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 uppercase">
                            {order.artwork_code || order.products?.artwork_code || '-'}
                        </span>
                        <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase">
                            {order.customer_name || '-'}
                        </span>
                    </div>
                </td>

                {/* 3. Qty / Rate */}
                <td className="px-6 py-4 text-center whitespace-nowrap">
                    <div className="text-sm font-bold text-slate-900 tabular-nums">
                        {order.quantity?.toLocaleString() || '0'}
                    </div>
                    {order.rate && <div className="text-[10px] text-slate-400 font-medium">₹{order.rate}</div>}
                </td>

                {/* 4. Process */}
                <td className="px-6 py-4">
                    {isEditing ? (
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <select
                                value={editProgress}
                                onChange={e => setEditProgress(e.target.value)}
                                className="text-xs font-semibold border border-indigo-300 rounded-md px-2 py-1 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                autoFocus
                            >
                                {PROCESS_OPTIONS.map((s: string) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <button onClick={() => handleQuickUpdate(order.id)} className="p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600"><Save className="w-3.5 h-3.5" /></button>
                        </div>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleQuickEdit(order); }}
                            className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider ring-1 ring-inset ${getProgressColor(order.progress)} hover:opacity-80 transition-opacity`}
                        >
                            {order.progress || 'Pending'}
                            <ChevronDown className="ml-1 h-3 w-3 opacity-40" />
                        </button>
                    )}
                </td>

                <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                        {(!order.status || order.status !== 'Complete') && (
                            <button
                                onClick={onCompleteClick}
                                disabled={isUpdating}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${confirming ? 'bg-orange-500 text-white border-orange-500 animate-pulse' : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50'} ${isUpdating ? 'opacity-50 cursor-wait' : ''}`}
                            >
                                {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                {confirming ? 'SURE?' : 'COMPLETE'}
                            </button>
                        )}
                        <Link href={`/orders/${order.id}`} className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-colors">
                            <Plus className="w-4 h-4" />
                        </Link>
                    </div>
                </td>
            </tr>
            {isExpanded && (
                <tr className="bg-slate-50/50">
                    <td colSpan={6} className="px-12 py-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 animate-in fade-in slide-in-from-top-2">
                            <DetailGroup title="Logistics" items={[
                                { label: 'Printer', value: order.printer_name },
                                { label: 'Printer Mob', value: order.printer_mobile },
                                { label: 'Del. Date', value: order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : '-' },
                                { label: 'Invoice', value: order.invoice_no },
                            ]} />
                            <DetailGroup title="Paper Details" items={[
                                { label: 'Paper Wala', value: order.paperwala_name },
                                { label: 'Paper Size', value: order.paper_order_size },
                                { label: 'Paper Required', value: order.paper_required },
                                { label: 'GSM / Type', value: `${order.gsm_value || '-'} / ${order.paper_type_name || '-'}` },
                            ]} />
                            <DetailGroup title="Production" items={[
                                { label: 'Gross Print', value: order.gross_print_qty },
                                { label: 'Total Print', value: order.total_print_qty },
                                { label: 'Qty Delivered', value: order.qty_delivered },
                                { label: 'Batch No', value: order.batch_no },
                                { label: 'Packing', value: order.packing_detail },
                                { label: 'Remarks', value: order.remarks },
                            ]} />
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Technical Specs</h4>
                                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 shadow-sm text-xs">
                                    <div className="flex justify-between border-b pb-1"><span className="text-slate-500">Plate No:</span> <span className="font-bold text-red-600">{order.plate_no || '-'}</span></div>
                                    <div className="flex justify-between border-b pb-1"><span className="text-slate-500">Ink Group:</span> <span className="font-semibold">{order.ink || '-'}</span></div>
                                    <div className="flex justify-between border-b pb-1"><span className="text-slate-500">Coating:</span> <span className="font-semibold">{order.coating || '-'}</span></div>
                                    <div className="flex justify-between border-b pb-1"><span className="text-slate-500">Pasting:</span> <span className="font-semibold">{order.pasting_type || '-'}</span></div>
                                    <div className="flex justify-between border-b pb-1"><span className="text-slate-500">Construction:</span> <span className="font-semibold">{order.construction_type || '-'}</span></div>
                                    <div className="flex justify-between pb-1"><span className="text-slate-500">Dim:</span> <span className="font-mono font-bold text-indigo-600">{order.dimension || '-'}</span></div>
                                </div>
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {order.artwork_pdf && <Link href={`/uploads/${order.artwork_pdf}`} target="_blank"><DocBadge label="PDF" /></Link>}
                                    {order.artwork_cdr && <Link href={`/uploads/${order.artwork_cdr}`} target="_blank"><DocBadge label="CDR" /></Link>}
                                    {order.shade_card_file && <DocBadge label="Shade" />}
                                    {order.del_label_file && <DocBadge label="Label" />}
                                    {order.coa_file && <DocBadge label="COA" />}
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </Fragment>
    );
});
OrderRow.displayName = 'OrderRow';

export default function OrdersPage() {

    // Data State
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [categoryMap, setCategoryMap] = useState<Record<number, string>>({});

    // View State
    const [showCompleted, setShowCompleted] = useState(false);
    const [groupByCategory, setGroupByCategory] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isPending, startTransition] = useTransition();

    // Pagination State
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 50;

    // Quick Edit State
    const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
    const [editProgress, setEditProgress] = useState('');

    // Expanded Rows State
    const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    }, []);

    const handleToggleCompleted = useCallback((checked: boolean) => {
        startTransition(() => {
            setShowCompleted(checked);
        });
    }, []);

    const handleToggleGrouping = useCallback((checked: boolean) => {
        startTransition(() => {
            setGroupByCategory(checked);
        });
    }, []);

    async function fetchOrders() {
        setLoading(true);
        setError(null);

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

        const categoriesQuery = supabase.from('category').select('id, name');

        const [ordersRes, categoriesRes] = await Promise.all([
            ordersQuery,
            categoriesQuery
        ]);

        if (ordersRes.error) {
            console.error('Error fetching orders:', ordersRes.error);
            setError(ordersRes.error.message);
        } else {
            console.log('Orders loaded:', ordersRes.data?.length);
            // Debugging status issue
            if (ordersRes.data && ordersRes.data.length > 0) {
                console.log('TOP 3 ORDERS STATUS CHECK:');
                ordersRes.data.slice(0, 3).forEach(o => {
                    console.log(`Order ID: ${o.id}, Job ID: ${o.order_id}, Status: '${o.status}', Progress: '${o.progress}'`);
                });
            }
            setOrders(ordersRes.data || []);
        }

        if (categoriesRes.data) {
            const map: Record<number, string> = {};
            categoriesRes.data.forEach((c: any) => map[c.id] = c.name);
            setCategoryMap(map);
        }

        setLoading(false);
    }

    const handleMarkComplete = useCallback(async (id: number) => {
        startTransition(() => {
            setIsUpdating(id);
        });

        try {
            const { error: updateError } = await supabase
                .from('orders')
                .update({
                    status: 'Complete',
                    progress: 'Ready'
                })
                .eq('id', id);

            if (updateError) throw updateError;

            startTransition(() => {
                setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'Complete', progress: 'Ready' } : o));
            });

        } catch (err: any) {
            console.error('Persistence Failure:', err);
            alert('SYSTEM ERROR: ' + (err.message || 'Status could not be saved.'));
        } finally {
            startTransition(() => {
                setIsUpdating(null);
            });
        }
    }, []);

    const toggleQuickEdit = useCallback((order: Order) => {
        setEditingOrderId(prev => {
            if (prev === order.id) {
                return null;
            } else {
                setEditProgress(order.progress || 'Printing');
                return order.id;
            }
        });
    }, []);

    const handleQuickUpdate = useCallback(async (id: number) => {
        if (!editProgress) return;
        const targetProgress = editProgress;

        const { error } = await supabase
            .from('orders')
            .update({ progress: targetProgress })
            .eq('id', id);

        if (error) {
            alert('Error updating progress: ' + error.message);
        } else {
            startTransition(() => {
                setOrders(prev => prev.map(o => o.id === id ? { ...o, progress: targetProgress } : o));
                setEditingOrderId(null);
            });
        }
    }, [editProgress]);

    const toggleRow = useCallback((id: number) => {
        setExpandedOrderId(prev => prev === id ? null : id);
    }, []);

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const s = (order.status || '').toLowerCase().trim();
            const isDone = s.includes('complete') || s === 'delivered';

            if (showCompleted) {
                if (!isDone) return false;
            } else {
                if (isDone) return false;
            }

            if (!searchTerm) return true;
            const search = searchTerm.toLowerCase();
            const pName = order.products?.product_name?.toLowerCase() || '';
            const oId = order.order_id?.toLowerCase() || '';
            const printer = order.printer_name?.toLowerCase() || '';
            return pName.includes(search) || oId.includes(search) || printer.includes(search);
        });
    }, [orders, searchTerm, showCompleted]);

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

    const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);

    return (
        <div className={`space-y-6 max-w-[1600px] mx-auto pb-12 px-4 transition-opacity duration-200 ${isPending ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                    <strong className="font-bold">Error: </strong> {error}
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    Production Orders
                    <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{filteredOrders.length}</span>
                    <span className="text-[10px] text-emerald-600 font-mono ml-2 border border-emerald-200 bg-emerald-50 px-2 py-0.5 rounded shadow-sm font-bold">v14:24 RLS-FIXED ✓</span>
                </h2>
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 select-none">
                        <input
                            type="checkbox"
                            checked={showCompleted}
                            onChange={e => handleToggleCompleted(e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        Show Completed
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 select-none">
                        <input
                            type="checkbox"
                            checked={groupByCategory}
                            onChange={e => handleToggleGrouping(e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        Group by Category
                    </label>
                    <Link href="/orders/new" className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Order
                    </Link>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search by Product Name, Order ID, or Printer..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={searchTerm}
                    onChange={handleSearchChange}
                />
            </div>

            <div className="space-y-6">
                {loading ? (
                    <div className="text-center py-20 text-slate-500 flex flex-col items-center gap-3 border border-slate-100 rounded-2xl bg-white shadow-sm">
                        <Loader2 className="animate-spin h-8 w-8 text-indigo-500" />
                        <span className="font-medium">Optimizing and Loading Orders...</span>
                    </div>
                ) : Object.keys(groupedOrders).length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200 border-dashed">
                        No active orders found.
                    </div>
                ) : (
                    <>
                        {(Object.entries(groupedOrders) as [string, any[]][]).map(([category, catOrders]) => (
                            <OrderGroup
                                key={category}
                                category={category}
                                catOrders={catOrders}
                                expandedOrderId={expandedOrderId}
                                toggleRow={toggleRow}
                                handleMarkComplete={handleMarkComplete}
                                toggleQuickEdit={toggleQuickEdit}
                                isUpdating={isUpdating}
                                editingOrderId={editingOrderId}
                                editProgress={editProgress}
                                setEditProgress={setEditProgress}
                                handleQuickUpdate={handleQuickUpdate}
                            />
                        ))}

                        {totalPages > 1 && (
                            <div className="flex justify-center items-center space-x-2 pt-6">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-3 py-1 bg-white border border-slate-300 rounded text-sm disabled:opacity-50 shadow-sm hover:bg-slate-50 transition-colors"
                                >
                                    Previous
                                </button>
                                <span className="text-sm font-medium text-slate-600">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-3 py-1 bg-white border border-slate-300 rounded text-sm disabled:opacity-50 shadow-sm hover:bg-slate-50 transition-colors"
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
