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
    Save,
    Download,
    ExternalLink,
    Mail,
    RefreshCw,
    Trash2
} from 'lucide-react';
import SendInvoiceEmailModal from '@/components/SendInvoiceEmailModal';

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
        const m = remarks.match(/\[PO:([^|]+)\|Item:([^|]+)\|Rate:([^|]+)(?:\|Code:([^|\]]+))?(?:\|Date:([^\]]+))?/);
        if (m) {
            return {
                isTagged: true,
                poNumber: m[1].trim(),
                poItemName: m[2].trim(),
                rate: parseFloat(m[3]) || fallbackRate,
                materialCode: m[4]?.trim() || '',
                poDate: m[5]?.trim() || '',
            };
        }
    }
    return {
        isTagged: false,
        poNumber: '',
        poItemName: '',
        rate: fallbackRate,
        materialCode: '',
        poDate: '',
    };
}

export function parseBoxesFromPacking(packingStr: string | null | undefined): number {
    if (!packingStr) return 0;
    const str = packingStr.trim();
    const boxMatches = str.match(/(\d+)\s*box(?:es)?/gi);
    if (boxMatches && boxMatches.length > 0) {
        let total = 0;
        for (const m of boxMatches) {
            const num = parseInt(m.match(/\d+/)?.[0] || '0', 10);
            total += num;
        }
        return total;
    }
    const justNum = parseInt(str, 10);
    if (!isNaN(justNum) && justNum > 0 && justNum < 500) {
        return justNum;
    }
    return 0;
}

export default function GenerateDocsModal({ isOpen, onClose }: GenerateDocsModalProps) {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<any[]>([]);
    const [selectedCompany, setSelectedCompany] = useState<CompanyName | 'All'>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // User editable boxes per item
    const [itemBoxes, setItemBoxes] = useState<Record<number, number>>({});

    // Inline quick-edit state
    const [editingOrder, setEditingOrder] = useState<number | null>(null);
    const [editQty, setEditQty] = useState<string>('');
    const [editPacking, setEditPacking] = useState<string>('');
    const [savingInline, setSavingInline] = useState(false);

    // Mandatory Processing Charges step state
    const [showProcessingChargeStep, setShowProcessingChargeStep] = useState(false);
    const [addProcessingCharges, setAddProcessingCharges] = useState<'yes' | 'no' | null>(null);
    const [procQty, setProcQty] = useState('1');
    const [procAmount, setProcAmount] = useState('');
    const [procDescription, setProcDescription] = useState('Label Processing Charges');

    // Direct dispatch package generation states
    const [isGeneratingPackage, setIsGeneratingPackage] = useState(false);
    const [generationProgressText, setGenerationProgressText] = useState('Creating invoice & generating documents...');
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [generatedResult, setGeneratedResult] = useState<{
        invoiceNumber: string;
        downloadUrl: string;
        invoiceUrl?: string;
        invoice?: any;
    } | null>(null);

    // Email modal state
    const [emailModalInvoice, setEmailModalInvoice] = useState<any | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        fetchCandidateOrders();
    }, [isOpen]);

    const fetchCandidateOrders = async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            // Fetch ONLY open orders (exclude Complete and Delivered)
            const { data, error } = await supabase
                .from('orders')
                .select('id, order_id, product_name, artwork_code, quantity, rate, qty_delivered, packing_detail, customer_name, from_our_company, remarks, status, delivery_address, delivery_date, invoice_no')
                .neq('status', 'Complete')
                .neq('status', 'Delivered')
                .order('id', { ascending: false })
                .limit(200);

            if (error) throw error;

            // Strict client-side filter to guarantee only active/open orders are shown
            const openOrders = (data || []).filter(o => {
                const s = (o.status || '').toLowerCase().trim();
                return !s.includes('complete') && s !== 'delivered';
            });

            setOrders(openOrders);
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
        const hasInvoice = Boolean(o.invoice_no && o.invoice_no.trim() && o.invoice_no.trim() !== '-' && !o.invoice_no.trim().toLowerCase().startsWith('inv-'));
        const isValid = hasPo && hasQtyDelivered && hasPackingDetails && !hasInvoice;
        const company = normalizeCompany(o.from_our_company);

        return {
            hasPo,
            hasQtyDelivered,
            hasPackingDetails,
            hasInvoice,
            invoiceNo: o.invoice_no,
            isValid,
            poInfo,
            company,
        };
    };

    // Total boxes across all selected orders
    const totalNoOfBoxes = useMemo(() => {
        return selectedIds.reduce((sum, id) => {
            const customVal = itemBoxes[id];
            if (customVal !== undefined) return sum + customVal;
            const ord = orders.find(o => o.id === id);
            return sum + parseBoxesFromPacking(ord?.packing_detail);
        }, 0);
    }, [selectedIds, itemBoxes, orders]);

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
        const val = getOrderValidation(order);
        if (val.hasInvoice) {
            alert(`Invoice ${val.invoiceNo} has already been generated for this order. It cannot be re-invoiced.`);
            return;
        }

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
        const val = getOrderValidation(order);
        if (val.hasInvoice) {
            alert(`Invoice ${val.invoiceNo} has already been generated for this order. It cannot be edited.`);
            return;
        }
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

        const handleUnlinkOrderInvoice = async (orderId: number, invoiceNo?: string) => {
        const confirmMsg = invoiceNo
            ? `Are you sure you want to unlink invoice "${invoiceNo}" from this order? Use this if the invoice was deleted in Zoho Books or assigned by mistake.`
            : 'Are you sure you want to unlink this invoice?';
        if (!confirm(confirmMsg)) return;

        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    invoice_no: null,
                    billed: 'false',
                })
                .eq('id', orderId);

            if (error) throw error;

            // Update local orders state
            setOrders(prev => prev.map(o => {
                if (o.id === orderId) {
                    return {
                        ...o,
                        invoice_no: null,
                        billed: 'false',
                    };
                }
                return o;
            }));
        } catch (err: any) {
            alert('Failed to unlink invoice: ' + err.message);
        }
    };

    const handleGenerateDocs = () => {
        if (selectedIds.length === 0) return;
        if (selectedValidationErrors.length > 0) return;

        // Open mandatory processing charge prompt step
        setAddProcessingCharges(null);
        setProcQty('1');
        setProcAmount('');
        const hasLabel = orders.some(o => selectedIds.includes(o.id) && (o.product_name || '').toLowerCase().includes('label'));
        setProcDescription(hasLabel ? 'Label Processing Charges' : 'Processing Charges');
        setShowProcessingChargeStep(true);
    };

    const handleConfirmAndProceed = async () => {
        if (!addProcessingCharges) return;

        setShowProcessingChargeStep(false);
        setIsGeneratingPackage(true);
        setGenerationProgressText('Creating official invoice in Zoho Books...');
        setGenerationError(null);

        try {
            const res = await fetch('/api/zoho/create-dispatch-package', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderIds: selectedIds,
                    noOfBoxes: totalNoOfBoxes,
                    hasProcessing: addProcessingCharges === 'yes',
                    procQty: parseFloat(procQty) || 1,
                    procAmount: parseFloat(procAmount) || 0,
                    procName: procDescription.trim() || 'Label Processing Charges',
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to create invoice & dispatch package.');
            }

            // Automatically trigger browser download of unified PDF
            if (data.downloadUrl) {
                const link = document.createElement('a');
                link.href = data.downloadUrl;
                link.download = `Dispatch_Documents_${data.invoiceNumber}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }

            setGeneratedResult(data);
            setSelectedIds([]);
            await fetchCandidateOrders();
        } catch (err: any) {
            console.error('Error creating dispatch package:', err);
            setGenerationError(err.message || 'An unexpected error occurred while generating documents.');
        } finally {
            setIsGeneratingPackage(false);
        }
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
                                                disabled={isDifferentCompany || val.hasInvoice}
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

                                                {/* Company & Invoice Badges */}
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {val.hasInvoice && (
                                                        <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-full pl-2.5 pr-1.5 py-0.5 shadow-xs">
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-800">
                                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                                Invoice: {val.invoiceNo}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleUnlinkOrderInvoice(order.id, val.invoiceNo);
                                                                }}
                                                                title="Unlink invoice (e.g. if deleted in Zoho Books or assigned by mistake)"
                                                                className="inline-flex items-center gap-0.5 ml-1 px-1.5 py-0.5 text-[10px] font-bold text-red-700 bg-red-100 hover:bg-red-200 border border-red-300 rounded-full transition-colors cursor-pointer"
                                                            >
                                                                <Trash2 className="w-2.5 h-2.5" />
                                                                Unlink
                                                            </button>
                                                        </div>
                                                    )}
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

                                                {/* Quick Edit Trigger (Only for orders without invoice) */}
                                                {!isEditing && !val.hasInvoice && (!val.hasQtyDelivered || !val.hasPackingDetails) && (
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

                                            {/* Item Box Count Input (Only when selected and not yet invoiced) */}
                                            {isSelected && !val.hasInvoice && (
                                                <div className="mt-2.5 flex items-center gap-2.5 bg-indigo-50/70 border border-indigo-200/80 rounded-xl px-3 py-2 animate-in fade-in">
                                                    <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-950">
                                                        <Package className="w-3.5 h-3.5 text-indigo-600" />
                                                        <span>No. of Boxes:</span>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={itemBoxes[order.id] !== undefined ? itemBoxes[order.id] : parseBoxesFromPacking(order.packing_detail)}
                                                        onChange={e => {
                                                            const valNum = parseInt(e.target.value, 10);
                                                            setItemBoxes(prev => ({
                                                                ...prev,
                                                                [order.id]: isNaN(valNum) ? 0 : valNum
                                                            }));
                                                        }}
                                                        className="w-16 px-2.5 py-1 bg-white border border-indigo-300 rounded-lg font-black text-xs text-indigo-950 text-center shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    />
                                                    <span className="text-[10px] text-slate-500 font-medium">
                                                        (Parsed from packing: {parseBoxesFromPacking(order.packing_detail)} boxes)
                                                    </span>
                                                </div>
                                            )}

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
                        <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3">
                            {selectedIds.length === 0 ? (
                                <span className="font-semibold text-slate-500">No orders selected yet.</span>
                            ) : (
                                <>
                                    <div>
                                        <span className="font-bold text-slate-900">{selectedIds.length}</span> order(s) selected for billing company:{' '}
                                        <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                            {currentSelectedCompany}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-950 font-bold text-xs">
                                        <Package className="w-4 h-4 text-indigo-600" />
                                        <span>Total Boxes: <strong className="font-black text-indigo-700 text-sm">{totalNoOfBoxes}</strong></span>
                                    </div>
                                </>
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

            {/* Mandatory Processing Charges Step Modal */}
            {showProcessingChargeStep && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 font-black text-sm">
                                    ₹
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold uppercase tracking-tight">Add Processing Charges?</h4>
                                    <p className="text-[10px] text-slate-400">Required step before generating Invoice & COAs</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowProcessingChargeStep(false)}
                                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-5 space-y-4">
                            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                                <p className="font-bold">Add processing charges as a separate line item?</p>
                                <p className="text-[11px] text-amber-800 mt-1">
                                    This will be added on the invoice apart from the actual label quantity and rate.
                                </p>
                            </div>

                            {/* Yes / No Options */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setAddProcessingCharges('no')}
                                    className={`p-3.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                                        addProcessingCharges === 'no'
                                            ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                    }`}
                                >
                                    <span className="text-base">❌ No</span>
                                    <span className="text-[10px] opacity-80">No Processing Charges</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setAddProcessingCharges('yes')}
                                    className={`p-3.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                                        addProcessingCharges === 'yes'
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-500/20'
                                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                    }`}
                                >
                                    <span className="text-base">✅ Yes</span>
                                    <span className="text-[10px] opacity-80">Add Separate Line Item</span>
                                </button>
                            </div>

                            {/* Inputs if Yes is selected */}
                            {addProcessingCharges === 'yes' && (
                                <div className="space-y-3 pt-3 border-t border-slate-200 animate-in fade-in slide-in-from-top-2">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                            Item Description
                                        </label>
                                        <input
                                            type="text"
                                            value={procDescription}
                                            onChange={e => setProcDescription(e.target.value)}
                                            placeholder="Label Processing Charges"
                                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                                Qty <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                step="1"
                                                value={procQty}
                                                onChange={e => setProcQty(e.target.value)}
                                                placeholder="1"
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                                Amount / Rate (₹) <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                min="0.01"
                                                step="any"
                                                value={procAmount}
                                                onChange={e => setProcAmount(e.target.value)}
                                                placeholder="e.g. 1500"
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-indigo-700 focus:bg-white focus:outline-none focus:border-indigo-500"
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    {procQty && procAmount && Number(procAmount) > 0 && (
                                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-2.5 text-xs flex justify-between items-center text-indigo-950 font-bold">
                                            <span>Invoice Line Total:</span>
                                            <span className="text-sm font-black text-indigo-700">
                                                ₹{(Number(procQty) * Number(procAmount)).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => setShowProcessingChargeStep(false)}
                                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                            >
                                Back
                            </button>

                            <button
                                type="button"
                                onClick={handleConfirmAndProceed}
                                disabled={
                                    !addProcessingCharges ||
                                    (addProcessingCharges === 'yes' && (!procAmount || Number(procAmount) <= 0 || !procQty || Number(procQty) <= 0))
                                }
                                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-extrabold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                            >
                                <span>Generate Invoice & Download Documents</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* In-Progress Generation Modal Overlay */}
            {isGeneratingPackage && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-8 max-w-sm w-full flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white text-[10px] font-black">
                                ✓
                            </div>
                        </div>

                        <div className="space-y-1">
                            <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">Generating Dispatch Package</h4>
                            <p className="text-xs font-medium text-slate-500">
                                Creating official Zoho invoice, compiling 3 identical copies and official COAs...
                            </p>
                        </div>

                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-indigo-600 h-full w-2/3 animate-pulse rounded-full" />
                        </div>
                    </div>
                </div>
            )}

            {/* Generation Error Alert Modal */}
            {generationError && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-red-200 p-6 max-w-md w-full space-y-4 animate-in zoom-in-95">
                        <div className="flex items-center gap-3 text-red-600">
                            <div className="p-2.5 bg-red-100 rounded-xl">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900">Failed to Generate Documents</h4>
                                <p className="text-xs text-red-600 font-semibold">{generationError}</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setGenerationError(null)}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl cursor-pointer"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Generation Success Dialog */}
            {generatedResult && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl border border-emerald-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header Banner */}
                        <div className="p-6 bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex flex-col items-center text-center space-y-3">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-lg">
                                <CheckCircle2 className="w-8 h-8 text-white" />
                            </div>
                            <div className="space-y-1">
                                <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-100">Success</span>
                                <h3 className="text-xl font-black">Dispatch Package Ready!</h3>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-xs font-black">
                                    <span>Invoice No:</span>
                                    <span className="text-white underline">{generatedResult.invoiceNumber}</span>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-5">
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
                                <div className="flex items-center gap-2 font-bold text-slate-800">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span>Download Started Automatically</span>
                                </div>
                                <p className="text-slate-600 text-[11px] leading-relaxed pl-6">
                                    Your unified PDF contains <strong>3 identical copies of the official Tax Invoice</strong> and all <strong>official client Certificates of Analysis (COAs)</strong>.
                                </p>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-2.5">
                                <a
                                    href={generatedResult.downloadUrl}
                                    download={`Dispatch_Documents_${generatedResult.invoiceNumber}.pdf`}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                                >
                                    <Download className="w-4 h-4" />
                                    <span>Download Dispatch PDF Again</span>
                                </a>

                                <div className="grid grid-cols-2 gap-2.5">
                                    {generatedResult.invoiceUrl && (
                                        <a
                                            href={generatedResult.invoiceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                                            <span>Zoho Books</span>
                                        </a>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (generatedResult.invoice) {
                                                setEmailModalInvoice(generatedResult.invoice);
                                            }
                                        }}
                                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                    >
                                        <Mail className="w-3.5 h-3.5 text-indigo-600" />
                                        <span>Email to Client</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setGeneratedResult(null);
                                    onClose();
                                }}
                                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                            >
                                Done & Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Email Modal */}
            {emailModalInvoice && (
                <SendInvoiceEmailModal
                    isOpen={Boolean(emailModalInvoice)}
                    onClose={() => setEmailModalInvoice(null)}
                    invoice={emailModalInvoice}
                />
            )}
        </div>
    );
}
