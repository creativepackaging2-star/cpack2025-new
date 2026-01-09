'use client';

import { useEffect, useState, useMemo, Fragment, useTransition, useDeferredValue, memo, useCallback } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Order } from '@/types';
import { Search, Plus, FileText, ChevronDown, ChevronRight, Save, X, CheckCircle, Loader2, Edit, Truck, Palette, MessageCircle, UserCheck, Database, Split, Printer } from 'lucide-react';
import Link from 'next/link';
import { PdfLogo, CdrLogo, WhatsAppLogo, PaperwalaWhatsAppLogo } from '@/components/FileLogos';

// --- Memoized Components for Performance ---

const DocBadge = memo(({ label }: { label: string }) => (
    <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-1 rounded text-[10px] font-normal">
        {label}
    </span>
));
DocBadge.displayName = 'DocBadge';

const DetailGroup = memo(({ title, items }: { title: string, items: { label: string, value: any }[] }) => (
    <div className="space-y-3">
        <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{title}</h4>
        <div className="space-y-2">
            {items.map((it, i) => (
                <div key={i} className="flex justify-between text-[10px] border-b border-slate-100 pb-1">
                    <span className="text-slate-500">{it.label}</span>
                    <span className="font-normal text-slate-900">{it.value || '-'}</span>
                </div>
            ))}
        </div>
    </div>
));
DetailGroup.displayName = 'DetailGroup';

const OrderGroup = memo(({ category, catOrders, expandedOrderId, toggleRow, handleMarkComplete, toggleQuickEdit, isUpdating, editingOrderId, editProgress, setEditProgress, handleQuickUpdate, handlePaperEntry, handleSplitOrder, selectedIds, toggleSelect, selectAll }: any) => {
    const categoryValue = catOrders.reduce((sum: number, o: any) => sum + (o.value || 0), 0);

    return (
        <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm mb-8">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-300 flex items-center gap-3">
                <h3 className="text-sm font-semibold text-slate-800">{category}</h3>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500 bg-white border border-slate-300 px-2 py-0.5 rounded-full">
                        {catOrders.length}
                    </span>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                        ₹{categoryValue.toLocaleString()}
                    </span>
                </div>
            </div>
            <div className="overflow-x-auto hidden md:block">
                <table className="min-w-full divide-y divide-slate-300">
                    <thead className="bg-slate-50">
                        <tr className="bg-slate-50">
                            <th className="px-3 py-3 text-left w-[40px]">
                                <input
                                    type="checkbox"
                                    checked={catOrders.every((o: any) => selectedIds.includes(o.id))}
                                    onChange={() => selectAll(catOrders.map((o: any) => o.id))}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                            </th>
                            <th className="px-3 py-3 text-left text-[10px] font-normal uppercase tracking-wider text-slate-500 w-[40px]"></th>
                            <th className="px-3 py-3 text-left text-[10px] font-normal uppercase tracking-wider text-slate-500">Product</th>
                            <th className="px-3 py-3 text-left text-[10px] font-normal uppercase tracking-wider text-slate-500">Qty</th>
                            <th className="px-3 py-3 text-left text-[10px] font-normal uppercase tracking-wider text-slate-500">U</th>
                            <th className="px-3 py-3 text-left text-[10px] font-normal uppercase tracking-wider text-slate-500">Specs</th>
                            <th className="px-3 py-3 text-left text-[10px] font-normal uppercase tracking-wider text-slate-500">Process</th>
                            <th className="px-3 py-3 text-center text-[10px] font-normal uppercase tracking-wider text-slate-500 w-[100px]">Logos</th>
                            <th className="px-3 py-3 text-right text-[10px] font-normal uppercase tracking-wider text-slate-500 w-[110px]">Action</th>
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
                                handleSplitOrder={handleSplitOrder}
                                selected={selectedIds.includes(order.id)}
                                toggleSelect={toggleSelect}
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
                        handleSplitOrder={handleSplitOrder}
                        selected={selectedIds.includes(order.id)}
                        toggleSelect={toggleSelect}
                        view="mobile"
                    />
                ))}
            </div>
        </div >
    );
});
OrderGroup.displayName = 'OrderGroup';

const PROCESS_OPTIONS = [
    'Paper', 'Plate', 'Print', 'Varnish', 'Foil', 'Pasting', 'Folding', 'Ready', 'Hold'
];

const getProgressColor = (progress: string | null) => {
    const s = progress?.toLowerCase() || '';
    if (s === 'ready') return 'bg-emerald-100 text-emerald-800 ring-emerald-600/20 font-normal';
    if (s === 'hold') return 'bg-red-100 text-red-800 ring-red-600/20 font-normal';
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
    handleSplitOrder,
    selected,
    toggleSelect,
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

    const handleSplit = (e: React.MouseEvent) => {
        e.stopPropagation();
        handleSplitOrder(order);
    };

    const sendToPaperwala = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!order.paperwala_mobile) {
            alert('No mobile number found for Paperwala.');
            return;
        }

        const gsmDisplay = order.products?.actual_gsm_used || order.gsm_value || '-';

        const msg = `*PAPER ORDER*
Size        : ${order.paper_order_size || '-'}
Qty         : ${order.paper_order_qty || '-'}
Paper       : ${order.paper_type_name || '-'}
GSM         : ${gsmDisplay}
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

        const msg = `*PRINTING ORDER*
Product    : ${order.products?.product_name || order.product_name || '-'}
Print Size : ${order.print_size || '-'}
Print Qty  : ${order.total_print_qty || '-'}
Paper      : ${order.paper_type_name || '-'}
GSM        : ${order.gsm_value || '-'}
Code       : ${order.products?.artwork_code || order.artwork_code || '-'}
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
                    <div className="mr-3 pt-0.5" onClick={e => e.stopPropagation()}>
                        <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleSelect(order.id)}
                            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="flex-1">
                        <div className="text-sm font-semibold text-slate-900 line-clamp-1">{order.products?.product_name || order.product_name || order.product_sku || 'Untitled'}</div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-normal text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 uppercase">
                                {order.products?.artwork_code || order.artwork_code || '-'}
                            </span>
                            {((order.parent_id && order.parent_id !== order.id) || order.order_id?.endsWith('-P') || order.order_id?.includes('SPLIT-')) && (
                                <span className="text-[9px] font-normal text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 uppercase flex items-center gap-1">
                                    <Split className="w-2 h-2" />
                                    Split Lot
                                </span>
                            )}
                            <button onClick={sendToPaperwala} title="Send to Paperwala via WhatsApp" className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-normal border border-emerald-100 active:bg-emerald-100 transition-colors">
                                <PaperwalaWhatsAppLogo className="w-4 h-4" />
                                Paper
                            </button>
                            <button onClick={sendToPrinter} title="Send to Printer via WhatsApp" className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-[10px] font-normal border border-blue-100 active:bg-blue-100 transition-colors">
                                <WhatsAppLogo className="w-4 h-4" />
                                Printer
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handlePaperEntry(order); }}
                                title={order.automation === 'PAPER_ENTRY_DONE' ? "Paper Entry already recorded" : "Run Paper Entry (IN/OUT)"}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-normal border transition-colors ${order.automation === 'PAPER_ENTRY_DONE' ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed' : 'bg-amber-50 text-amber-700 border-amber-100 active:bg-amber-100'}`}
                                disabled={isUpdating === order.id || order.automation === 'PAPER_ENTRY_DONE'}
                            >
                                {isUpdating === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className={`w-3.5 h-3.5 ${order.automation === 'PAPER_ENTRY_DONE' ? 'text-slate-300' : ''}`} />}
                                {order.automation === 'PAPER_ENTRY_DONE' ? 'Recorded' : 'Paper Entry'}
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
                        <button
                            onClick={handleSplit}
                            className="p-1.5 text-amber-600 bg-amber-50 rounded-full border border-amber-100"
                            title="Split Lot"
                        >
                            <Split className="w-4 h-4" />
                        </button>
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
                <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                    <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelect(order.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                </td>
                <td className="px-3 py-2 text-center">
                    <button className="p-1 hover:bg-slate-200 rounded-md transition-colors">
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-indigo-600" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    </button>
                </td>

                <td className="px-3 py-2 w-1/4">
                    <div className="text-[10px] font-semibold text-slate-900 line-clamp-1">{order.products?.product_name || order.product_name || order.product_sku || 'Untitled Product'}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[8px] font-normal text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 uppercase">
                            {order.products?.artwork_code || order.artwork_code || '-'}
                        </span>
                        {((order.parent_id && order.parent_id !== order.id) || order.order_id?.endsWith('-P') || order.order_id?.includes('SPLIT-')) && (
                            <span className="text-[8px] font-normal text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-100 uppercase flex items-center gap-0.5 shadow-sm">
                                <Split className="w-2 h-2" />
                                Lot
                            </span>
                        )}
                    </div>
                </td>

                <td className="px-3 py-2 text-center w-[60px]">
                    <div className="text-[10px] font-semibold text-slate-900">{(order.quantity || 0).toLocaleString()}</div>
                </td>

                <td className="px-3 py-2 text-center">
                    <div className="text-xs font-normal text-slate-600">{order.products?.actual_gsm_used || '-'}</div>
                </td>

                <td className="px-3 py-2 flex-1 min-w-[300px]">
                    <div className="text-[10px] text-slate-700 leading-relaxed font-medium line-clamp-2" title={order.specs || ''}>
                        {order.specs || '-'}
                    </div>
                </td>

                <td className="px-3 py-2">
                    {isEditing ? (
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <select
                                value={editProgress}
                                onChange={e => setEditProgress(e.target.value)}
                                className="text-xs font-normal border border-indigo-300 rounded-md px-2 py-1 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                autoFocus
                            >
                                {PROCESS_OPTIONS.map((s: string) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <button onClick={() => handleQuickUpdate(order.id)} className="p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600"><Save className="w-3.5 h-3.5" /></button>
                        </div>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleQuickEdit(order); }}
                            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-normal uppercase tracking-wider ring-1 ring-inset ${getProgressColor(order.progress)} hover:opacity-80 transition-opacity`}
                        >
                            {order.progress || 'Pending'}
                            <ChevronDown className="ml-0.5 h-2.5 w-2.5 opacity-40" />
                        </button>
                    )}
                </td>

                <td className="px-3 py-1 text-center">
                    <div className="flex flex-col items-center gap-1.5 min-w-[140px]">
                        <div className="flex items-center justify-center gap-2">
                            <button onClick={sendToPrinter} title="Send to Printer via WhatsApp" className="p-0.5 hover:bg-blue-50 rounded-full transition-colors">
                                <WhatsAppLogo className="w-5 h-5" />
                            </button>
                            <button onClick={sendToPaperwala} title="Send to Paperwala via WhatsApp" className="p-0.5 hover:bg-emerald-50 rounded-full transition-colors">
                                <PaperwalaWhatsAppLogo className="w-5 h-5" />
                            </button>
                            {order.artwork_pdf && (
                                <a href={order.artwork_pdf} target="_blank" rel="noopener noreferrer" title="View PDF">
                                    <PdfLogo className="w-5 h-5" />
                                </a>
                            )}
                            {order.artwork_cdr && (
                                <a href={order.artwork_cdr} target="_blank" rel="noopener noreferrer" title="View CDR">
                                    <CdrLogo className="w-5 h-5" />
                                </a>
                            )}
                        </div>
                        <div className="flex items-center justify-center gap-2 border-t border-slate-100 pt-1.5 w-full">
                            <button
                                onClick={(e) => { e.stopPropagation(); handlePaperEntry(order); }}
                                disabled={isUpdating === order.id || order.automation === 'PAPER_ENTRY_DONE'}
                                title={order.automation === 'PAPER_ENTRY_DONE' ? "Paper Entry already recorded" : "Run Paper Entry (IN/OUT)"}
                                className={`p-0.5 rounded-full transition-colors ${isUpdating === order.id || order.automation === 'PAPER_ENTRY_DONE' ? 'cursor-not-allowed' : 'hover:bg-amber-50'}`}
                            >
                                {isUpdating === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" /> : <Database className={`w-4 h-4 ${order.automation === 'PAPER_ENTRY_DONE' ? 'text-slate-300' : 'text-amber-600'}`} />}
                            </button>
                            <Link
                                href={`/orders/${order.id}/coa`}
                                target="_blank"
                                title="Generate COA"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <FileText className="w-4 h-4 text-indigo-400 hover:text-indigo-600" />
                            </Link>
                            <button onClick={() => generateDoc('Delivery Label', order.id)} title="Generate Delivery Label">
                                <Truck className="w-4 h-4 text-amber-400 hover:text-amber-600" />
                            </button>
                            <button onClick={() => generateDoc('Shade Card', order.id)} title="Generate Shade Card">
                                <Palette className="w-4 h-4 text-rose-400 hover:text-rose-600" />
                            </button>
                        </div>
                    </div>
                </td>

                <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-0.5" onClick={e => e.stopPropagation()}>
                        {(!order.status || order.status !== 'Complete') && (
                            <button
                                onClick={onCompleteClick}
                                disabled={isUpdating}
                                className={`p-1 rounded-full transition-all border ${confirming ? 'bg-orange-500 text-white border-orange-500' : 'text-emerald-600 border-emerald-100 hover:bg-emerald-50'} ${isUpdating ? 'opacity-50 cursor-wait' : ''}`}
                                title={confirming ? 'Click again to confirm complete' : 'Mark as Complete'}
                            >
                                {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                            </button>
                        )}
                        <button
                            onClick={handleSplit}
                            disabled={isUpdating}
                            className="p-1 text-amber-500 hover:bg-amber-50 rounded-full transition-colors border border-amber-100"
                            title="Split for Partial Delivery"
                        >
                            <Split className="w-3 h-3" />
                        </button>
                        <Link href={`/orders/${order.id}`} className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-colors" title="Edit Full Details">
                            <Edit className="w-3 h-3" />
                        </Link>
                    </div>
                </td>
            </tr>
            {isExpanded && (
                <tr className="bg-slate-50/50">
                    <td colSpan={9} className="px-6 py-10">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 animate-in fade-in slide-in-from-top-2">
                            <div className="md:col-span-2">
                                <DetailGroup title="Logistics" items={[
                                    { label: 'Printer', value: order.printer_name },
                                    { label: 'Printer Mob', value: order.printer_mobile },
                                    { label: 'Del. Date', value: order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : '-' },
                                    { label: 'Invoice', value: order.invoice_no },
                                ]} />
                            </div>
                            <div className="md:col-span-2">
                                <DetailGroup title="Paper Details" items={[
                                    { label: 'Paper Wala', value: order.paperwala_name },
                                    { label: 'Paper Size', value: order.paper_order_size },
                                    { label: 'Paper Required', value: order.paper_required },
                                    { label: 'GSM / Type', value: `${order.gsm_value || '-'} / ${order.paper_type_name || '-'}` },
                                ]} />
                            </div>
                            <div className="md:col-span-2">
                                <DetailGroup title="Production" items={[
                                    { label: 'Gross Print', value: order.gross_print_qty },
                                    { label: 'Total Print', value: order.total_print_qty },
                                    { label: 'Qty Delivered', value: order.qty_delivered },
                                    { label: 'Batch No', value: order.batch_no },
                                    { label: 'Packing', value: order.packing_detail },
                                    { label: 'Remarks', value: order.remarks },
                                ]} />
                            </div>
                            <div className="md:col-span-6 text-left">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Technical Specs</h4>
                                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                                        <div className="space-y-2">
                                            <div className="flex justify-between border-b pb-1 text-[10px]"><span className="text-slate-500 font-medium">Plate No:</span> <span className="font-bold text-red-600">{order.plate_no || '-'}</span></div>
                                            <div className="flex justify-between border-b pb-1 text-[10px]"><span className="text-slate-500 font-medium">Ink Group:</span> <span className="font-bold text-slate-900">{order.ink || '-'}</span></div>
                                            <div className="flex justify-between border-b pb-1 text-[10px]"><span className="text-slate-500 font-medium">Coating:</span> <span className="font-bold text-slate-900">{order.coating || '-'}</span></div>
                                            <div className="flex justify-between border-b pb-1 text-[10px]"><span className="text-slate-500 font-medium">Pasting:</span> <span className="font-bold text-slate-900">{order.pasting_type || '-'}</span></div>
                                            <div className="flex justify-between border-b pb-1 text-[10px]"><span className="text-slate-500 font-medium">Construction:</span> <span className="font-bold text-slate-900">{order.construction_type || '-'}</span></div>
                                            <div className="flex justify-between border-b pb-1 text-[10px]"><span className="text-slate-500 font-medium">Specification:</span> <span className="font-bold text-slate-900">{order.specification || '-'}</span></div>
                                            <div className="flex justify-between pb-0.5 text-[10px]"><span className="text-slate-500 font-bold uppercase tracking-wider">Dim:</span> <span className="font-mono font-bold text-indigo-700">{order.dimension || '-'}</span></div>
                                        </div>
                                    </div>
                                    {order.specs && (
                                        <div className="bg-indigo-50 p-3.5 rounded-xl border border-indigo-200 mt-2">
                                            <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1.5 opacity-70">Full Specifications Detail</div>
                                            <div className="text-[10px] text-slate-700 font-mono leading-relaxed font-semibold">{order.specs}</div>
                                        </div>
                                    )}
                                    <div className="flex flex-wrap gap-3 pt-1.5">
                                        {order.artwork_pdf && <a href={order.artwork_pdf} target="_blank" rel="noopener noreferrer" title="Open PDF" className="hover:scale-110 transition-all"><PdfLogo className="w-9 h-9" /></a>}
                                        {order.artwork_cdr && <a href={order.artwork_cdr} target="_blank" rel="noopener noreferrer" title="Open CDR" className="hover:scale-110 transition-all"><CdrLogo className="w-9 h-9" /></a>}
                                    </div>
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
    const deferredSearchTerm = useDeferredValue(searchTerm);
    const [isPending, startTransition] = useTransition();

    // Pagination State
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 50;

    // Quick Edit State
    const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
    const [editProgress, setEditProgress] = useState('');

    // Expanded Rows State
    const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

    // Multi-select State
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const toggleSelect = useCallback((id: number, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    }, []);

    const selectAll = useCallback((ids: number[]) => {
        setSelectedIds(prev => {
            const allSelected = ids.every(id => prev.includes(id));
            if (allSelected) {
                return prev.filter(id => !ids.includes(id));
            } else {
                return [...new Set([...prev, ...ids])];
            }
        });
    }, []);

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
                    gsm_id,
                    actual_gsm_used
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

            // 1. PAPER IN - Condition: if paper_type_name is not blank
            const actualGsm = order.products?.actual_gsm_used;
            const noteSuffix = actualGsm ? ` (Actual: ${actualGsm})` : '';

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
                    notes: `Warehouse: ${order.printer_name || 'Stock'}${noteSuffix}`
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
                    notes: `Warehouse: ${order.printer_name || 'Stock'}${noteSuffix}`
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

    const handleSplitOrder = useCallback(async (order: any) => {
        const splitQtyStr = window.prompt(`Current Qty: ${order.quantity}\n\nEnter quantity to split for Partial Delivery:`, "0");
        if (!splitQtyStr) return;

        const splitQty = parseInt(splitQtyStr);
        if (isNaN(splitQty) || splitQty <= 0 || splitQty >= (order.quantity || 0)) {
            alert('Invalid quantity. Must be a number greater than 0 and less than ' + (order.quantity || 0));
            return;
        }

        setIsUpdating(order.id);
        try {
            // Clone order data (excluding relational fields and IDs)
            const { id, created_at, updated_at, products, ...rawOrder } = order;

            // Prepare New Partial Order
            const partialOrder = {
                ...rawOrder,
                quantity: splitQty,
                qty_delivered: splitQty,
                invoice_no: '', // Reset for input
                status: 'Partially Delivered',
                progress: 'Ready',
                parent_id: order.id,
                order_id: order.order_id ? `${order.order_id}-P` : `SPLIT-${Date.now().toString(36).toUpperCase()}`
            };

            const { error: insertError } = await supabase.from('orders').insert([partialOrder]);
            if (insertError) throw insertError;

            // Update original order
            const { error: updateError } = await supabase
                .from('orders')
                .update({ quantity: (order.quantity || 0) - splitQty })
                .eq('id', order.id);

            if (updateError) throw updateError;

            alert(`✅ Successfully split ${splitQty} into a new order lot.`);
            fetchOrders();
        } catch (err: any) {
            console.error('Split Error:', err);
            alert('Split failed: ' + (err.message || 'Unknown error'));
        } finally {
            setIsUpdating(null);
        }
    }, [orders]);

    const toggleRow = useCallback((id: number) => {
        setExpandedOrderId(prev => prev === id ? null : id);
    }, []);

    const sortedOrders = useMemo(() => {
        const list = [...orders];
        list.sort((a, b) => {
            const aBase = a.parent_id || a.id;
            const bBase = b.parent_id || b.id;

            if (aBase !== bBase) return bBase - aBase; // Sort clusters by base ID descending (newest first)

            // Same cluster grouping: Parent first, then children by ID
            const isAParent = !a.parent_id || a.parent_id === a.id;
            const isBParent = !b.parent_id || b.parent_id === b.id;

            if (isAParent) return -1;
            if (isBParent) return 1;
            return a.id - b.id;
        });
        return list;
    }, [orders]);

    const filteredOrders = useMemo(() => {
        return sortedOrders.filter(order => {
            const s = (order.status || '').toLowerCase().trim();
            const isDone = s.includes('complete') || s === 'delivered';

            if (showCompleted) {
                if (!isDone) return false;
            } else {
                if (isDone) return false;
            }

            if (!deferredSearchTerm) return true;
            const search = deferredSearchTerm.toLowerCase();
            const pNameSnapshot = order.product_name?.toLowerCase() || '';
            const pNameRaw = order.products?.product_name?.toLowerCase() || '';
            const oId = order.order_id?.toLowerCase() || '';
            const printer = order.printer_name?.toLowerCase() || '';
            return pNameSnapshot.includes(search) || pNameRaw.includes(search) || oId.includes(search) || printer.includes(search);
        });
    }, [orders, deferredSearchTerm, showCompleted]);

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

    const totalValue = useMemo(() => {
        return filteredOrders.reduce((sum, o) => sum + (o.value || 0), 0);
    }, [filteredOrders]);

    return (
        <div className={`space-y-6 max-w-[1800px] mx-auto pb-12 px-4 md:px-6 transition-opacity duration-200 ${isPending ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                    <strong className="font-bold">Error: </strong> {error}
                </div>
            )}

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center justify-between lg:justify-start gap-4">
                    <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 flex flex-wrap items-center gap-2">
                        Orders
                        <div className="flex items-center gap-1.5">
                            <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{filteredOrders.length}</span>
                            <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                ₹{totalValue.toLocaleString()}
                            </span>
                        </div>
                    </h2>
                    <Link href="/orders/new" className="lg:hidden inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors shadow-sm">
                        <Plus className="mr-1 h-4 w-4" />
                        New
                    </Link>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1.5 shadow-sm gap-1">
                        <Link
                            href="/orders/summary/printer"
                            title="Printer Summary"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-md transition-all"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Printers</span>
                        </Link>
                        <div className="w-[1px] h-4 bg-slate-200"></div>
                        <Link
                            href="/orders/summary/paper"
                            title="Paper Order Summary"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:text-emerald-600 rounded-md transition-all"
                        >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Paper</span>
                        </Link>
                        <div className="w-[1px] h-4 bg-slate-200"></div>
                        <Link
                            href="/orders/summary/punching"
                            title="Punching Summary"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:text-rose-600 rounded-md transition-all"
                        >
                            <Palette className="w-3.5 h-3.5" />
                            <span>Punching</span>
                        </Link>
                    </div>

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
                                handleSplitOrder={handleSplitOrder}
                                selectedIds={selectedIds}
                                toggleSelect={toggleSelect}
                                selectAll={selectAll}
                            />
                        ))}

                        {/* Floating Selection Bar */}
                        {selectedIds.length > 0 && (
                            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 fade-in">
                                <div className="bg-slate-900 text-white px-6 py-4 rounded-3xl shadow-2xl border border-slate-700 flex flex-col md:flex-row items-center gap-6">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-lg shadow-indigo-500/20">
                                            {selectedIds.length}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Selected Orders</p>
                                            <button
                                                onClick={() => setSelectedIds([])}
                                                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase underline"
                                            >
                                                Clear Selection
                                            </button>
                                        </div>
                                    </div>
                                    <div className="h-10 w-[1px] bg-slate-700 hidden md:block"></div>
                                    <div className="flex items-center gap-3">
                                        <Link
                                            href={`/orders/summary/printer?ids=${selectedIds.join(',')}`}
                                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95"
                                        >
                                            <Printer className="w-4 h-4" />
                                            Printer Summary
                                        </Link>
                                        <Link
                                            href={`/orders/summary/paper?ids=${selectedIds.join(',')}`}
                                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95"
                                        >
                                            <Truck className="w-4 h-4" />
                                            Paper
                                        </Link>
                                        <Link
                                            href={`/orders/summary/punching?ids=${selectedIds.join(',')}`}
                                            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95"
                                        >
                                            <Palette className="w-4 h-4" />
                                            Punching
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )}

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
