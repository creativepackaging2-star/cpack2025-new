'use client';

import { useEffect, useState, useMemo, Fragment, useTransition, memo, useCallback } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Order } from '@/types';
import { Search, Plus, FileText, ChevronDown, ChevronRight, Save, X, CheckCircle, Loader2, Edit, Truck, Palette, MessageCircle, UserCheck, Database } from 'lucide-react';
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

const OrderGroup = memo(({ category, catOrders, expandedOrderId, toggleRow, handleMarkComplete, toggleQuickEdit, isUpdating, editingOrderId, editProgress, setEditProgress, handleQuickUpdate, handlePaperEntry }: any) => {
    return (
        <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm mb-8">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-300 flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-800">{category}</h3>
                <span className="text-xs font-medium text-slate-500 bg-white border border-slate-300 px-2 py-0.5 rounded-full">
                    {catOrders.length}
                </span>
            </div>
            <div className="overflow-x-auto hidden md:block">
                <table className="min-w-full divide-y divide-slate-300">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 w-[40px]"></th>
                            <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Product</th>
                            <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Qty</th>
                            <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Specs</th>
                            <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Process</th>
                            <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">Files</th>
                            <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 bg-white">
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
                                handlePaperEntry={handlePaperEntry}
                                view="table"
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile View - Cards */}
            <div className="md:hidden divide-y divide-slate-100">
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
                        handlePaperEntry={handlePaperEntry}
                        view="mobile"
                    />
                ))}
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
    handlePaperEntry,
    view = "table"
}: any) => {
    const [confirming, setConfirming] = useState(false);
    const s = order.progress?.toLowerCase() || '';

    // Row style based on progress
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

    const sendToPaperwala = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!order.paperwala_mobile) {
            alert('No mobile number found for Paperwala.');
            return;
        }

        const msg = `*Paper Order*
Size        : ${order.paper_order_size || '-'}
Qty         : ${order.paper_order_qty || '-'}
Paper       : ${order.paper_type_name || '-'}
GSM         : ${order.gsm_value || '-'}
Delivery At : ${order.printer_name || '-'}`;

        const phone = order.paperwala_mobile.replace(/\D/g, '');
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    };

    const sendToPrinter = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!order.printer_mobile) {
            alert('No mobile number found for Printer/Supervisor.');
            return;
        }

        const msg = `*Printing Order*
Product    : ${order.product_name || '-'}
Print Size : ${order.print_size || '-'}
Print Qty  : ${order.total_print_qty || '-'}
Paper      : ${order.paper_type_name || '-'}
GSM        : ${order.gsm_value || '-'}
Code       : ${order.artwork_code || '-'}
Ink        : ${order.ink || '-'}
Plate No   : ${order.plate_no || '-'}`;

        const phone = order.printer_mobile.replace(/\D/g, '');
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    };

    const generateDoc = (type: string, orderId: number) => {
        if (type === 'COA') {
            console.log('Generating COA for order:', orderId);
            window.open(`/orders/${orderId}/coa`, '_blank');
        } else if (type === 'Delivery Label') {
            console.log('Generating Delivery Label for order:', orderId);
            window.open(`/orders/${orderId}/delivery-label`, '_blank');
        } else if (type === 'Shade Card') {
            console.log('Generating Shade Card for order:', orderId);
            window.open(`/orders/${orderId}/shade-card`, '_blank');
        } else {
            alert(`${type} generation will be available once templates are defined.`);
        }
    };

    if (view === "mobile") {
        return (
            <div className={`p-4 ${isExpanded ? 'bg-indigo-50/30' : 'bg-white'} border-l-4 ${s === 'hold' ? 'border-red-500' : s === 'ready' ? 'border-emerald-500' : 'border-transparent'}`} onClick={() => toggleRow(order.id)}>
                <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                        <div className="text-sm font-bold text-slate-900 line-clamp-1">{order.products?.product_name || order.product_name || order.product_sku || 'Untitled'}</div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 uppercase">
                                {order.products?.artwork_code || order.artwork_code || '-'}
                            </span>
                            <button onClick={sendToPaperwala} title="Send to Paperwala via WhatsApp" className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-bold border border-emerald-100 active:bg-emerald-100 transition-colors">
                                <MessageCircle className="w-3.5 h-3.5" />
                                Paper
                            </button>
                            <button onClick={sendToPrinter} title="Send to Printer via WhatsApp" className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold border border-blue-100 active:bg-blue-100 transition-colors">
                                <UserCheck className="w-3.5 h-3.5" />
                                Printer
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handlePaperEntry(order); }}
                                title={order.automation === 'PAPER_ENTRY_DONE' ? "Paper Entry already recorded" : "Run Paper Entry (IN/OUT)"}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold border transition-colors ${order.automation === 'PAPER_ENTRY_DONE' ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed' : 'bg-amber-50 text-amber-700 border-amber-100 active:bg-amber-100'}`}
                                disabled={isUpdating === order.id || order.automation === 'PAPER_ENTRY_DONE'}
                            >
                                {isUpdating === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className={`w-3.5 h-3.5 ${order.automation === 'PAPER_ENTRY_DONE' ? 'text-slate-300' : ''}`} />}
                                {order.automation === 'PAPER_ENTRY_DONE' ? 'Recorded' : 'Paper Entry'}
                            </button>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <Link
                                href={`/orders/${order.id}/coa`}
                                target="_blank"
                                className="p-1.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100 hover:bg-indigo-100 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <FileText className="w-3.5 h-3.5" />
                            </Link>
                            <button onClick={() => generateDoc('Delivery Label', order.id)} className="p-1.5 bg-amber-50 text-amber-700 rounded-md border border-amber-100">
                                <Truck className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => generateDoc('Shade Card', order.id)} className="p-1.5 bg-rose-50 text-rose-700 rounded-md border border-rose-100">
                                <Palette className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-slate-700 line-clamp-1 flex-1">{order.specs || '-'}</div>
                    <div className="text-sm font-semibold text-slate-900 ml-2">{(order.quantity || 0).toLocaleString()}</div>
                </div>

                <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleQuickEdit(order); }}
                            className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ring-1 ring-inset ${getProgressColor(order.progress)}`}
                        >
                            {order.progress || 'Pending'}
                        </button>
                    </div>

                    <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                        {(!order.status || order.status !== 'Complete') && (
                            <button
                                onClick={onCompleteClick}
                                className={`p-1.5 rounded-full border ${confirming ? 'bg-orange-500 text-white border-orange-500' : 'text-emerald-600 border-emerald-100'}`}
                            >
                                {confirming ? <CheckCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                            </button>
                        )}
                        <Link href={`/orders/${order.id}`} className="p-1.5 text-slate-400 border border-slate-100 rounded-full">
                            <Edit className="w-4 h-4" />
                        </Link>
                    </div>
                </div>

                {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 gap-2 animate-in fade-in slide-in-from-top-2">
                        <div className="text-[10px] font-medium text-slate-500">
                            {order.specs}
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 pt-2">
                            <span>ID: {order.order_id}</span>
                            <span>Date: {order.order_date}</span>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <Fragment>
            <tr className={rowClassName} onClick={() => toggleRow(order.id)}>
                <td className="px-3 py-2 text-center">
                    <button className="p-1 hover:bg-slate-200 rounded-md transition-colors">
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-indigo-600" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    </button>
                </td>

                <td className="px-3 py-2">
                    <div className="text-sm font-bold text-slate-900 line-clamp-1">{order.products?.product_name || order.product_name || order.product_sku || 'Untitled Product'}</div>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 uppercase">
                            {order.products?.artwork_code || order.artwork_code || '-'}
                        </span>
                    </div>
                </td>

                <td className="px-3 py-2 text-center">
                    <div className="text-sm font-semibold text-slate-900">{(order.quantity || 0).toLocaleString()}</div>
                </td>

                <td className="px-3 py-2 max-w-[300px]">
                    <div className="text-xs text-slate-700 leading-relaxed font-medium line-clamp-2" title={order.specs || ''}>
                        {order.specs || '-'}
                    </div>
                </td>

                <td className="px-3 py-2">
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

                <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                        <button onClick={sendToPaperwala} title="Send to Paperwala via WhatsApp" className="p-1 hover:bg-emerald-50 rounded-full transition-colors">
                            <MessageCircle className="w-4 h-4 text-emerald-600" />
                        </button>
                        <button onClick={sendToPrinter} title="Send to Printer via WhatsApp" className="p-1 hover:bg-blue-50 rounded-full transition-colors">
                            <UserCheck className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handlePaperEntry(order); }}
                            disabled={isUpdating === order.id || order.automation === 'PAPER_ENTRY_DONE'}
                            title={order.automation === 'PAPER_ENTRY_DONE' ? "Paper Entry already recorded" : "Run Paper Entry (IN/OUT)"}
                            className={`p-1 rounded-full transition-colors ${isUpdating === order.id || order.automation === 'PAPER_ENTRY_DONE' ? 'cursor-not-allowed' : 'hover:bg-amber-50'}`}
                        >
                            {isUpdating === order.id ? <Loader2 className="w-4 h-4 animate-spin text-amber-600" /> : <Database className={`w-4 h-4 ${order.automation === 'PAPER_ENTRY_DONE' ? 'text-slate-300' : 'text-amber-600'}`} />}
                        </button>
                        <div className="w-[1px] h-4 bg-slate-200 mx-1"></div>
                        {order.artwork_pdf && (
                            <a href={order.artwork_pdf} target="_blank" rel="noopener noreferrer" title="View Artwork PDF" className="p-1 hover:bg-red-50 rounded-full transition-colors">
                                <FileText className="w-4 h-4 text-red-500" />
                            </a>
                        )}
                        {order.artwork_cdr && (
                            <a href={order.artwork_cdr} target="_blank" rel="noopener noreferrer" title="View Artwork CDR" className="p-1 hover:bg-orange-50 rounded-full transition-colors">
                                <Edit className="w-4 h-4 text-orange-500" />
                            </a>
                        )}
                        <div className="w-[1px] h-4 bg-slate-200 mx-1"></div>
                        <Link
                            href={`/orders/${order.id}/coa`}
                            target="_blank"
                            title="Generate COA"
                            className="p-1 hover:bg-indigo-50 rounded-full transition-colors inline-flex"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <FileText className="w-4 h-4 text-indigo-400 opacity-60 hover:opacity-100" />
                        </Link>
                        <button onClick={() => generateDoc('Delivery Label', order.id)} title="Generate Delivery Label" className="p-1 hover:bg-amber-50 rounded-full transition-colors">
                            <Truck className="w-4 h-4 text-amber-400 opacity-60 hover:opacity-100" />
                        </button>
                        <button onClick={() => generateDoc('Shade Card', order.id)} title="Generate Shade Card" className="p-1 hover:bg-rose-50 rounded-full transition-colors">
                            <Palette className="w-4 h-4 text-rose-400 opacity-60 hover:opacity-100" />
                        </button>
                    </div>
                </td>

                <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-3" onClick={e => e.stopPropagation()}>
                        {(!order.status || order.status !== 'Complete') && (
                            <button
                                onClick={onCompleteClick}
                                disabled={isUpdating}
                                className={`p-1.5 rounded-full transition-all border ${confirming ? 'bg-orange-500 text-white border-orange-500' : 'text-emerald-600 border-emerald-100 hover:bg-emerald-50'} ${isUpdating ? 'opacity-50 cursor-wait' : ''}`}
                                title={confirming ? 'Click again to confirm complete' : 'Mark as Complete'}
                            >
                                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            </button>
                        )}
                        <Link href={`/orders/${order.id}`} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-colors" title="Edit Full Details">
                            <Edit className="w-4 h-4" />
                        </Link>
                    </div>
                </td>
            </tr>
            {isExpanded && (
                <tr className="bg-slate-50/50">
                    <td colSpan={7} className="px-12 py-8">
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
                                    <div className="flex justify-between border-b pb-1"><span className="text-slate-500">Specification:</span> <span className="font-semibold">{order.specification || '-'}</span></div>
                                    <div className="flex justify-between pb-1"><span className="text-slate-500">Dim:</span> <span className="font-mono font-bold text-indigo-600">{order.dimension || '-'}</span></div>
                                </div>
                                {order.specs && (
                                    <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200 mt-2">
                                        <div className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest mb-1">Full Specs</div>
                                        <div className="text-xs text-slate-700 font-mono leading-relaxed">{order.specs}</div>
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {order.artwork_pdf && <a href={order.artwork_pdf} target="_blank" rel="noopener noreferrer"><DocBadge label="PDF" /></a>}
                                    {order.artwork_cdr && <a href={order.artwork_cdr} target="_blank" rel="noopener noreferrer"><DocBadge label="CDR" /></a>}
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </Fragment >
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
                    category_id,
                    paper_type_id,
                    gsm_id
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

    const handlePaperEntry = useCallback(async (order: any) => {
        setIsUpdating(order.id);

        try {
            const paperTypeId = order.products?.paper_type_id;
            const gsmId = order.products?.gsm_id;

            if (!paperTypeId || !gsmId) {
                alert('Incomplete product paper data. Cannot create transactions.');
                setIsUpdating(null);
                return;
            }

            const transactions: any[] = [];

            const inQty = order.paper_order_qty || 0;
            const outQty = order.paper_required || order.total_print_qty || 0;

            console.log(`Calculating Entry for Order ${order.id}:`, { inQty, outQty });

            // 1. PAPER IN - Condition: if paper_type_name is not blank
            if (order.paper_type_name && inQty > 0) {
                transactions.push({
                    tx_type: 'IN',
                    paper_type_id: paperTypeId,
                    gsm_id: gsmId,
                    paper_order_size_id: order.paper_order_size_id,
                    printer_id: order.printer_id,
                    qty: inQty,
                    unit: 'sheets',
                    reference: order.order_id,
                    notes: `Warehouse: ${order.printer_name || 'Stock'}`
                });
            }

            // 2. PAPER OUT - Material required for the job
            if (outQty > 0) {
                transactions.push({
                    tx_type: 'OUT',
                    paper_type_id: paperTypeId,
                    gsm_id: gsmId,
                    paper_order_size_id: order.paper_order_size_id,
                    printer_id: order.printer_id,
                    qty: outQty,
                    unit: 'sheets',
                    reference: order.order_id,
                    notes: `Warehouse: ${order.printer_name || 'Stock'}`
                });
            }

            if (transactions.length === 0) {
                alert('No paper quantities found to enter.');
                setIsUpdating(null);
                return;
            }

            const { error: insertError } = await supabase
                .from('paper_transactions')
                .insert(transactions);

            if (insertError) throw insertError;

            // Update order to prevent double entry
            const { error: updateError } = await supabase
                .from('orders')
                .update({ automation: 'PAPER_ENTRY_DONE' })
                .eq('id', order.id);

            if (updateError) {
                console.warn('Paper transactions saved, but failed to mark order:', updateError);
            }

            startTransition(() => {
                setOrders(prev => prev.map(o => o.id === order.id ? { ...o, automation: 'PAPER_ENTRY_DONE' } : o));
            });

            alert(`Successfully added ${transactions.length} paper transaction(s).`);
        } catch (err: any) {
            console.error('Paper Entry Error:', err);
            alert('Error entering paper transactions: ' + (err.message || 'Unknown error'));
        } finally {
            setIsUpdating(null);
        }
    }, []);

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
            const pNameSnapshot = order.product_name?.toLowerCase() || '';
            const pNameRaw = order.products?.product_name?.toLowerCase() || '';
            const oId = order.order_id?.toLowerCase() || '';
            const printer = order.printer_name?.toLowerCase() || '';
            return pNameSnapshot.includes(search) || pNameRaw.includes(search) || oId.includes(search) || printer.includes(search);
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

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center justify-between lg:justify-start gap-4">
                    <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        Orders
                        <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{filteredOrders.length}</span>
                    </h2>
                    <Link href="/orders/new" className="lg:hidden inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-sm">
                        <Plus className="mr-1 h-4 w-4" />
                        New
                    </Link>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                    <label className="flex flex-1 sm:flex-none items-center gap-2 text-[11px] md:text-sm text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 select-none">
                        <input
                            type="checkbox"
                            checked={showCompleted}
                            onChange={e => handleToggleCompleted(e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        Completed Only
                    </label>
                    <label className="flex flex-1 sm:flex-none items-center gap-2 text-[11px] md:text-sm text-slate-600 bg-white px-3 py-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 select-none">
                        <input
                            type="checkbox"
                            checked={groupByCategory}
                            onChange={e => handleToggleGrouping(e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        Grouped
                    </label>
                    <Link href="/orders/new" className="hidden lg:inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors shadow-sm">
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
                                handlePaperEntry={handlePaperEntry}
                            />
                        ))}

                        {totalPages > 1 && (
                            <>
                                {/* Mobile Pagination */}
                                <div className="flex md:hidden justify-center items-center space-x-2 pt-6 pb-4">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium disabled:opacity-50 shadow-sm hover:bg-slate-50 transition-colors"
                                    >
                                        ← Prev
                                    </button>
                                    <span className="text-sm font-medium text-slate-600 px-2">
                                        {page} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium disabled:opacity-50 shadow-sm hover:bg-slate-50 transition-colors"
                                    >
                                        Next →
                                    </button>
                                </div>

                                {/* Desktop Pagination */}
                                <div className="hidden md:flex justify-center items-center space-x-2 pt-6">
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
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
