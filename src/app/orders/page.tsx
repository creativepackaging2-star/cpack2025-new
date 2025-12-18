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
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm mb-8 animate-in fade-in duration-500">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center gap-2">
                <h3 className="font-bold text-slate-800 tracking-tight">{category}</h3>
                <span className="text-[10px] font-black text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full shadow-sm">
                    {catOrders.length} ORDERS
                </span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600 border-collapse">
                    <thead className="bg-white text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-3 w-[30px]"></th>
                            <th className="px-2 py-3 w-[25%] uppercase tracking-widest">Product Info</th>
                            <th className="px-4 py-3 w-[10%] text-center uppercase tracking-widest">Qty</th>
                            <th className="px-4 py-3 w-[15%] uppercase tracking-widest">Process</th>
                            <th className="px-4 py-3 w-[20%] uppercase tracking-widest">Specs</th>
                            <th className="px-4 py-3 w-[10%] text-center uppercase tracking-widest">Total Print</th>
                            <th className="px-4 py-3 w-[15%] text-right uppercase tracking-widest">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
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
    const rowBaseStyle = isExpanded ? 'bg-indigo-50/50' : 'hover:bg-slate-50/80';
    let rowClassName = `${rowBaseStyle} transition-colors group`;

    if (s === 'hold') rowClassName = `bg-red-50 hover:bg-red-100 ring-1 ring-inset ring-red-200 group`;
    else if (s === 'ready') rowClassName = `bg-emerald-50 hover:bg-emerald-100 ring-1 ring-inset ring-emerald-200 group`;

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
            <tr className={rowClassName}>
                <td className="px-2 py-4 align-top">
                    <button onClick={() => toggleRow(order.id)} className="p-1.5 hover:bg-slate-200/50 rounded-lg text-slate-400 transition-all active:scale-90">
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-indigo-500" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                </td>
                <td className="px-3 py-4 align-top">
                    <div className="font-black text-slate-900 leading-tight tracking-tight uppercase group-hover:text-indigo-600 transition-colors">
                        {order.products?.product_name || order.product_sku || 'Untitled Product'}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="text-[9px] font-black text-white bg-slate-900 px-1.5 py-0.5 rounded tracking-tighter shadow-sm">JOB: {order.order_id || 'N/A'}</span>
                        <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 uppercase tracking-tighter">
                            {order.artwork_code || order.products?.artwork_code || '-'}
                        </span>
                        <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-tighter">
                            {order.customer_name || '-'}
                        </span>
                    </div>
                </td>

                <td className="px-4 py-4 align-top">
                    <div className="font-mono font-black text-lg text-slate-800 leading-none tabular-nums tracking-tighter">
                        {order.quantity?.toLocaleString() || '0'}
                    </div>
                    {order.rate && <div className="text-[10px] text-slate-400 font-bold mt-1 tracking-widest">₹{order.rate}</div>}
                </td>

                <td className="px-4 py-4 align-top">
                    {isEditing ? (
                        <div className="flex items-center gap-1 animate-in zoom-in-95 duration-150">
                            <select
                                value={editProgress}
                                onChange={e => setEditProgress(e.target.value)}
                                className="text-[11px] font-bold border-2 border-indigo-200 rounded-lg px-2 py-1.5 w-full bg-white shadow-xl focus:border-indigo-500 outline-none transition-all"
                                autoFocus
                            >
                                {PROCESS_OPTIONS.map((s: string) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <button onClick={() => handleQuickUpdate(order.id)} className="p-1.5 bg-emerald-500 text-white rounded-lg shadow-lg hover:bg-emerald-600 active:scale-95 transition-all"><Save className="w-3.5 h-3.5" /></button>
                        </div>
                    ) : (
                        <button
                            onClick={() => toggleQuickEdit(order)}
                            className={`inline-flex items-center rounded-lg px-3 py-1.5 text-[10px] font-black tracking-widest ring-1 ring-inset ${getProgressColor(order.progress)} hover:shadow-md active:scale-95 transition-all uppercase`}
                        >
                            {order.progress || 'Pending'}
                            <ChevronDown className="ml-1.5 h-3 w-3 opacity-40" />
                        </button>
                    )}
                </td>

                <td className="px-4 py-4 align-top">
                    <div className="grid grid-cols-1 gap-1.5 min-w-[150px]">
                        <div className="flex items-baseline gap-2">
                            <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded leading-none border border-indigo-100 uppercase tracking-tighter">
                                {order.gsm_value || '-'} {order.paper_type_name || '-'}
                            </span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {order.dimension && <div className="text-[9px] text-slate-500 font-bold border border-slate-200 px-1.5 rounded uppercase tracking-tighter">{order.dimension}</div>}
                            {order.ink && <div className="text-[9px] text-slate-400 font-medium italic border-l-2 border-indigo-200 pl-1.5 leading-none">{order.ink}</div>}
                        </div>
                    </div>
                </td>

                <td className="px-4 py-4 align-top text-center">
                    <div className="font-mono text-[11px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 inline-block">
                        {order.total_print_qty?.toLocaleString() || '-'}
                    </div>
                </td>

                <td className="px-3 py-4 align-top text-right">
                    <div className="flex flex-col items-end gap-2">
                        {(!order.status || order.status !== 'Complete') && (
                            <button
                                onClick={onCompleteClick}
                                disabled={isUpdating}
                                className={`group flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black transition-all shadow-sm active:scale-95 border-2 ${confirming ? 'bg-orange-500 text-white border-orange-500 animate-pulse' : 'bg-white text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white hover:border-emerald-600'} ${isUpdating ? 'opacity-50 grayscale cursor-wait' : ''}`}
                            >
                                {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : confirming ? <CheckCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3 group-hover:scale-125 transition-transform" />}
                                {confirming ? 'SURE?' : 'COMPLETE'}
                            </button>
                        )}
                        <Link href={`/orders/${order.id}`} className="text-slate-400 hover:text-indigo-600 text-[10px] font-bold tracking-widest uppercase hover:underline p-1 transition-all">
                            Edit Order
                        </Link>
                    </div>
                </td>
            </tr>
            {isExpanded && (
                <tr className="bg-slate-50 border-x-4 border-indigo-500/20">
                    <td colSpan={7} className="px-8 py-6">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 animate-in fade-in slide-in-from-top-2 duration-200">
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
                                { label: 'Gross Print', value: order.gross_print_qty },
                            ]} />
                            <DetailGroup title="Production" items={[
                                { label: 'Current Progress', value: order.progress },
                                { label: 'Qty Delivered', value: order.qty_delivered },
                                { label: 'Packing Detail', value: order.packing_detail },
                                { label: 'Batch No', value: order.batch_no },
                                { label: 'Remarks', value: order.remarks },
                            ]} />
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Documents</h4>
                                <div className="flex flex-wrap gap-2">
                                    {order.coa_file && <DocBadge label="COA" />}
                                    {order.del_label_file && <DocBadge label="Label" />}
                                    {order.shade_card_file && <DocBadge label="Shade" />}
                                    {!order.coa_file && !order.del_label_file && !order.shade_card_file && <span className="text-xs text-slate-300">No docs attached</span>}
                                </div>
                                <div className="pt-4 flex flex-col gap-2">
                                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 mb-2 shadow-sm">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1 mb-2">Manufacturing Data</div>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                                            <div className="text-slate-500">GSM / Paper:</div><div className="font-bold text-indigo-600 uppercase tracking-tighter">{order.gsm_value || '-'} / {order.paper_type_name || '-'}</div>
                                            <div className="text-slate-500">Ink:</div><div className="font-semibold">{order.ink || '-'}</div>
                                            <div className="text-slate-500">Coating/Effects:</div><div className="font-semibold">{order.coating || '-'} | {order.special_effects || '-'}</div>
                                            <div className="text-slate-500">Pasting:</div><div className="font-semibold">{order.pasting_type || '-'}</div>
                                            <div className="text-slate-500">Plate No:</div><div className="font-semibold text-red-600">{order.plate_no || '-'}</div>
                                        </div>
                                    </div>
                                    <Link href={`/orders/${order.id}`} className="inline-flex items-center justify-center bg-indigo-600 text-white rounded-lg px-4 py-2 text-xs font-bold hover:bg-indigo-700 shadow-md transition-all active:scale-95 uppercase tracking-tighter">
                                        VIEW FULL ORDER DETAILS
                                    </Link>
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
                    <span className="text-[12px] text-black font-black bg-yellow-400 border-4 border-black px-4 py-1 rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-bounce ml-4 rotate-2">
                        v20:15 ULTRA-FAST-FINAL
                    </span>
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
