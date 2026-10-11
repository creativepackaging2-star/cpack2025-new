'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import {
    X,
    FileText,
    CheckCircle2,
    AlertCircle,
    Building2,
    Package,
    Truck,
    Search,
    Loader2,
    ArrowRight,
    Edit3,
    Save
} from 'lucide-react';

interface GenerateDocsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export type CompanyName = 'Creative Packaging' | 'Creative Printers' | 'Creative Enterprise';

export function normalizeCompany(companyStr: string | null | undefined): CompanyName {
    const s = (companyStr || '').toLowerCase();
    if (s.includes('print')) return 'Creative Printers';
    if (s.includes('enter')) return 'Creative Enterprise';
    return 'Creative Packaging';
}

export function parseOrderPoInfo(remarks: string | null | undefined, fallbackRate = 0) {
    if (remarks && remarks.includes('[PO:')) {
        const m = remarks.match(/\[PO:([^|]+)\|Item:([^|]+)\|Rate:([^|]+)(?:\|Code:([^\]]+))?/);
        if (m) {
            return {
                isTagged: true,
                poNumber: m[1].trim(),
                poItemName: m[2].trim(),
                rate: parseFloat(m[3]) || fallbackRate,
                materialCode: m[4]?.trim() || '',
            };
        }
    }
    return {
        isTagged: false,
        poNumber: '',
        poItemName: '',
        rate: fallbackRate,
        materialCode: '',
    };
}

export default function GenerateDocsModal({ isOpen, onClose }: GenerateDocsModalProps) {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<any[]>([]);
    const [selectedCompany, setSelectedCompany] = useState<CompanyName | 'All'>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Inline quick-edit state
    const [editingOrder, setEditingOrder] = useState<number | null>(null);
    const [editQty, setEditQty] = useState<string>('');
    const [editPacking, setEditPacking] = useState<string>('');
    const [savingInline, setSavingInline] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        fetchCandidateOrders();
    }, [isOpen]);

    const fetchCandidateOrders = async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            // Fetch open orders
            const { data, error } = await supabase
                .from('orders')
                .select('id, order_id, product_name, artwork_code, quantity, rate, qty_delivered, packing_detail, customer_name, from_our_company, remarks, status, delivery_address, delivery_date')
                .order('id', { ascending: false })
                .limit(100);

            if (error) throw error;
            setOrders(data || []);
        } catch (err: any) {
            console.error('Error fetching orders:', err);
            setErrorMsg(err.message || 'Failed to load orders.');
        } finally {
            setLoading(false);
        }
    };

    // Filtered orders
    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            const comp = normalizeCompany(o.from_our_company);
            if (selectedCompany !== 'All' && comp !== selectedCompany) {
                return false;
            }
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const pName = (o.product_name || '').toLowerCase();
                const ordId = (o.order_id || '').toLowerCase();
                const artCode = (o.artwork_code || '').toLowerCase();
                const remarks = (o.remarks || '').toLowerCase();
                if (!pName.includes(q) && !ordId.includes(q) && !artCode.includes(q) && !remarks.includes(q)) {
                    return false;
                }
            }
            return true;
        });
    }, [orders, selectedCompany, searchQuery]);

    // Validation helper for each order
    const getOrderValidation = (o: any) => {
        const poInfo = parseOrderPoInfo(o.remarks, o.rate);
        const hasPo = poInfo.isTagged;
        const hasQtyDelivered = Number(o.qty_delivered) > 0;
        const hasPackingDetails = Boolean(o.packing_detail && o.packing_detail.trim());
        const isValid = hasPo && hasQtyDelivered && hasPackingDetails;
        const company = normalizeCompany(o.from_our_company);

        return {
            hasPo,
            hasQtyDelivered,
            hasPackingDetails,
            isValid,
            poInfo,
            company,
        };
    };

    // Determine target company for currently selected orders
    const currentSelectedCompany = useMemo<CompanyName | null>(() => {
        if (selectedIds.length === 0) return null;
        const firstOrder = orders.find(o => o.id === selectedIds[0]);
        return firstOrder ? normalizeCompany(firstOrder.from_our_company) : null;
    }, [selectedIds, orders]);

    // Global validation for selected items
    const selectedValidationErrors = useMemo(() => {
        if (selectedIds.length === 0) return [];
        const errors: string[] = [];

        // Check company uniformity
        const companies = new Set<CompanyName>();
        selectedIds.forEach(id => {
            const o = orders.find(x => x.id === id);
            if (o) companies.add(normalizeCompany(o.from_our_company));
        });

        if (companies.size > 1) {
            errors.push('All selected orders must be from the same company (Creative Packaging, Creative Printers, or Creative Enterprise).');
        }

        // Check each selected order's criteria
        selectedIds.forEach(id => {
            const o = orders.find(x => x.id === id);
            if (!o) return;
            const val = getOrderValidation(o);
            const missingParts: string[] = [];
            if (!val.hasPo) missingParts.push('PO Not Tagged');
            if (!val.hasQtyDelivered) missingParts.push('Qty Delivered Missing');
            if (!val.hasPackingDetails) missingParts.push('Packing Details Missing');

            if (missingParts.length > 0) {
                errors.push(`Order #${o.order_id || o.id} (${o.product_name}): ${missingParts.join(', ')}`);
            }
        });

        return errors;
    }, [selectedIds, orders]);

    const handleToggleSelect = (order: any) => {
        const id = order.id;
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(x => x !== id));
            return;
        }

        // If another company is already selected, prevent selection
        const orderCompany = normalizeCompany(order.from_our_company);
        if (currentSelectedCompany && currentSelectedCompany !== orderCompany) {
            alert(`You have already selected orders from ${currentSelectedCompany}. All items on an invoice must belong to the same company. Please generate documents for ${orderCompany} separately.`);
            return;
        }

        setSelectedIds(prev => [...prev, id]);
    };

    const handleSelectAllValid = () => {
        if (filteredOrders.length === 0) return;

        // Choose company of first valid item or selected company
        let targetComp: CompanyName = selectedCompany !== 'All' ? selectedCompany : normalizeCompany(filteredOrders[0].from_our_company);
        if (currentSelectedCompany) targetComp = currentSelectedCompany;

        const validMatchingIds = filteredOrders
            .filter(o => normalizeCompany(o.from_our_company) === targetComp)
            .filter(o => getOrderValidation(o).isValid)
            .map(o => o.id);

        setSelectedIds(validMatchingIds);
    };

    const handleDeselectAll = () => {
        setSelectedIds([]);
    };

    // Quick inline save for Qty Delivered & Packing Details
    const handleStartQuickEdit = (order: any) => {
        setEditingOrder(order.id);
        setEditQty(order.qty_delivered ? String(order.qty_delivered) : (order.quantity ? String(order.quantity) : ''));
        setEditPacking(order.packing_detail || '');
    };

    const handleSaveQuickEdit = async (orderId: number) => {
        setSavingInline(true);
        try {
            const parsedQty = parseFloat(editQty) || 0;
            const { error } = await supabase
                .from('orders')
                .update({
                    qty_delivered: parsedQty,
                    packing_detail: editPacking.trim(),
                })
                .eq('id', orderId);

            if (error) throw error;

            // Update local state
            setOrders(prev => prev.map(o => {
                if (o.id === orderId) {
                    return {
                        ...o,
                        qty_delivered: parsedQty,
                        packing_detail: editPacking.trim(),
                    };
                }
                return o;
            }));

            setEditingOrder(null);
        } catch (err: any) {
            alert('Failed to update order: ' + err.message);
        } finally {
            setSavingInline(false);
        }
    };

    const handleGenerateDocs = () => {
        if (selectedIds.length === 0) return;
        if (selectedValidationErrors.length > 0) return;

        // Navigate to dispatch documents page
        router.push(`/orders/dispatch-documents?ids=${selectedIds.join(',')}`);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-600 rounded-xl shadow-inner">
                            <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold uppercase tracking-tight">Generate Dispatch Documents</h3>
                                <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-400/30">
                                    Invoice in Triplicate + COAs
                                </span>
                            </div>
                            <p className="text-xs text-slate-400">
                                Select orders tagged under PO with Qty Delivered and Packing Details to create dispatch package
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Filter Toolbar */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shrink-0">
                    {/* Company Tabs */}
                    <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200 shadow-sm text-xs font-bold overflow-x-auto">
                        {(['All', 'Creative Packaging', 'Creative Printers', 'Creative Enterprise'] as const).map(c => {
                            const active = selectedCompany === c;
                            return (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setSelectedCompany(c)}
                                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                                        active
                                            ? 'bg-slate-900 text-white shadow-sm'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                                >
                                    {c === 'All' ? 'All Companies' : c}
                                </button>
                            );
                        })}
                    </div>

                    {/* Search & Bulk Select */}
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1 md:w-64">
                            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search product / order / PO..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={handleSelectAllValid}
                            className="px-2.5 py-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg cursor-pointer transition-colors whitespace-nowrap"
                            title="Select all ready orders for current company"
                        >
                            Select Ready
                        </button>

                        {selectedIds.length > 0 && (
                            <button
                                type="button"
                                onClick={handleDeselectAll}
                                className="px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors whitespace-nowrap"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Orders List Body */}
                <div className="p-4 md:p-6 overflow-y-auto space-y-3 flex-1 bg-slate-100/50">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center text-center">
                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
                            <p className="text-xs font-bold text-slate-600">Loading orders & PO tags...</p>
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="py-16 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-300 p-8">
                            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                            <p className="text-sm font-bold text-slate-700">No matching orders found</p>
                            <p className="text-xs text-slate-400 mt-1">Try changing company filter or upload a PO to tag orders.</p>
                        </div>
                    ) : (
                        filteredOrders.map(order => {
                            const val = getOrderValidation(order);
                            const isSelected = selectedIds.includes(order.id);
                            const isDifferentCompany = Boolean(currentSelectedCompany && currentSelectedCompany !== val.company);
                            const isEditing = editingOrder === order.id;

                            return (
                                <div
                                    key={order.id}
                                    className={`bg-white rounded-xl border p-4 transition-all shadow-sm ${
                                        isSelected
                                            ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/10'
                                            : isDifferentCompany
                                            ? 'opacity-60 border-slate-200 bg-slate-50'
                                            : 'border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex items-start gap-3.5">
                                        {/* Selection Checkbox */}
                                        <div className="pt-0.5">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                disabled={isDifferentCompany}
                                                onChange={() => handleToggleSelect(order)}
                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                                            />
                                        </div>

                                        {/* Main Order Details */}
                                        <div className="flex-1 min-w-0 space-y-2">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                                <div>
                                                    <span className="text-xs font-mono font-bold text-slate-400 uppercase">
                                                        {order.order_id || `#${order.id}`}
                                                    </span>
                                                    <h4 className="text-sm font-bold text-slate-900 truncate">
                                                        {order.product_name}
                                                    </h4>
                                                </div>

                                                {/* Company Badge */}
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                        <Building2 className="w-3 h-3 text-slate-500" />
                                                        {val.company}
                                                    </span>
                                                    {order.artwork_code && (
                                                        <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                                            {order.artwork_code}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Status Validation Badges */}
                                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                                {/* 1. PO Tag Status */}
                                                {val.hasPo ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                        PO: {val.poInfo.poNumber} (Rate: ₹{val.poInfo.rate})
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-50 text-red-700 border border-red-200 font-bold text-[11px]" title="Order must be tagged with a PO">
                                                        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                                                        PO Not Tagged
                                                    </span>
                                                )}

                                                {/* 2. Qty Delivered Status */}
                                                {val.hasQtyDelivered ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold text-[11px]">
                                                        <Truck className="w-3.5 h-3.5 text-indigo-600" />
                                                        Delivered Qty: {Number(order.qty_delivered).toLocaleString()}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px]">
                                                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                                        Qty Delivered Missing
                                                    </span>
                                                )}

                                                {/* 3. Packing Details Status */}
                                                {val.hasPackingDetails ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-50 text-purple-800 border border-purple-200 font-bold text-[11px]">
                                                        <Package className="w-3.5 h-3.5 text-purple-600" />
                                                        Packing: {order.packing_detail}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px]">
                                                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                                        Packing Details Missing
                                                    </span>
                                                )}

                                                {/* Quick Edit Trigger */}
                                                {!isEditing && (!val.hasQtyDelivered || !val.hasPackingDetails) && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleStartQuickEdit(order)}
                                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline ml-auto cursor-pointer"
                                                    >
                                                        <Edit3 className="w-3 h-3" />
                                                        Fill Qty & Packing
                                                    </button>
                                                )}
                                            </div>

                                            {/* Inline Quick Edit Form */}
                                            {isEditing && (
                                                <div className="mt-2.5 p-3 bg-amber-50/80 rounded-xl border border-amber-200 grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-amber-900 uppercase">Qty Delivered</label>
                                                        <input
                                                            type="number"
                                                            value={editQty}
                                                            onChange={e => setEditQty(e.target.value)}
                                                            placeholder="e.g. 3000"
                                                            className="w-full mt-0.5 bg-white border border-amber-300 rounded px-2 py-1 text-xs font-bold text-slate-800"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-amber-900 uppercase">Packing Details</label>
                                                        <input
                                                            type="text"
                                                            value={editPacking}
                                                            onChange={e => setEditPacking(e.target.value)}
                                                            placeholder="e.g. 50 x 32 x 32"
                                                            className="w-full mt-0.5 bg-white border border-amber-300 rounded px-2 py-1 text-xs font-bold text-slate-800"
                                                        />
                                                    </div>
                                                    <div className="flex gap-1.5">
                                                        <button
                                                            type="button"
                                                            disabled={savingInline}
                                                            onClick={() => handleSaveQuickEdit(order.id)}
                                                            className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold cursor-pointer"
                                                        >
                                                            {savingInline ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                                            Save
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingOrder(null)}
                                                            className="px-2 py-1.5 bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 rounded text-xs font-bold cursor-pointer"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer Validation & Action Bar */}
                <div className="p-4 md:p-6 bg-white border-t border-slate-200 space-y-3 shrink-0">
                    {/* Validation Errors Alert Banner */}
                    {selectedIds.length > 0 && selectedValidationErrors.length > 0 && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1">
                            <div className="flex items-center gap-2 text-xs font-bold text-red-800">
                                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                                <span>Cannot Generate Documents due to missing requirements:</span>
                            </div>
                            <ul className="list-disc list-inside text-[11px] text-red-700 pl-4 space-y-0.5">
                                {selectedValidationErrors.map((err, i) => (
                                    <li key={i}>{err}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-xs text-slate-600">
                            {selectedIds.length === 0 ? (
                                <span className="font-semibold text-slate-500">No orders selected yet.</span>
                            ) : (
                                <div>
                                    <span className="font-bold text-slate-900">{selectedIds.length}</span> order(s) selected for billing company:{' '}
                                    <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                        {currentSelectedCompany}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer w-full sm:w-auto"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleGenerateDocs}
                                disabled={selectedIds.length === 0 || selectedValidationErrors.length > 0}
                                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer w-full sm:w-auto"
                            >
                                <span>Generate Documents (Triplicate + COAs)</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
