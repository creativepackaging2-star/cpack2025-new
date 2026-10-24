'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { Order } from '@/types';
import {
    ArrowLeft,
    Printer,
    Sparkles,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Building2,
    FileCheck,
    X
} from 'lucide-react';
import Link from 'next/link';
import InvoicePrintableCopy, { InvoiceCopyItem } from '@/components/InvoicePrintableCopy';
import COATemplate from '@/components/COATemplate';
import { CompanyName, normalizeCompany, parseOrderPoInfo } from '@/components/GenerateDocsModal';

function DispatchDocumentsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const idsParam = searchParams.get('ids') || '';

    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<any[]>([]);
    const [company, setCompany] = useState<CompanyName>('Creative Packaging');

    // Header Meta
    const [invoiceNo, setInvoiceNo] = useState(`INV-${Date.now().toString().slice(-5)}`);
    const [invoiceDate, setInvoiceDate] = useState(() => {
        const d = new Date();
        return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    });
    const [poNumber, setPoNumber] = useState('');
    const [poDate, setPoDate] = useState('');
    const [noOfBoxes, setNoOfBoxes] = useState('');
    const [customerName, setCustomerName] = useState('BDR Pharmaceuticals International Pvt. Ltd.');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [taxType, setTaxType] = useState<'IGST' | 'CGST_SGST'>('IGST');

    // Processing Charges mandatory state
    const hasProcessingParam = searchParams.get('hasProcessing');
    const procQtyParam = searchParams.get('procQty');
    const procAmountParam = searchParams.get('procAmount');
    const procNameParam = searchParams.get('procName');

    const [processingChargeState, setProcessingChargeState] = useState<{
        decided: boolean;
        enabled: boolean;
        qty: number;
        amount: number;
        name: string;
    }>(() => {
        if (hasProcessingParam === '1') {
            return {
                decided: true,
                enabled: true,
                qty: parseFloat(procQtyParam || '1') || 1,
                amount: parseFloat(procAmountParam || '0') || 0,
                name: procNameParam ? decodeURIComponent(procNameParam) : 'Label Processing Charges',
            };
        } else if (hasProcessingParam === '0') {
            return {
                decided: true,
                enabled: false,
                qty: 1,
                amount: 0,
                name: 'Label Processing Charges',
            };
        }
        return {
            decided: false,
            enabled: false,
            qty: 1,
            amount: 0,
            name: 'Label Processing Charges',
        };
    });

    const [showEditProcessingModal, setShowEditProcessingModal] = useState(false);
    const [tempChoice, setTempChoice] = useState<'yes' | 'no' | null>(null);
    const [tempQty, setTempQty] = useState('1');
    const [tempAmount, setTempAmount] = useState('');
    const [tempName, setTempName] = useState('Label Processing Charges');

    // Zoho Sync state
    const [isCreatingZoho, setIsCreatingZoho] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; url?: string } | null>(null);

    useEffect(() => {
        if (!idsParam) {
            setLoading(false);
            return;
        }

        const ids = idsParam.split(',').map(s => s.trim()).filter(Boolean);
        if (ids.length === 0) {
            setLoading(false);
            return;
        }

        (async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('orders')
                    .select(`
                        *,
                        products (
                            id,
                            product_name,
                            artwork_code,
                            dimension,
                            folding,
                            folding_dim,
                            ink,
                            plate_no,
                            coating,
                            special_effects,
                            specs,
                            gsm!fk_gsm (name),
                            paper_types!fk_paper_type (name),
                            constructions!fk_construction (name),
                            specifications!fk_specification (name)
                        )
                    `)
                    .in('id', ids);

                if (error) throw error;

                if (data && data.length > 0) {
                    setOrders(data);

                    // Auto-resolve billing company from the PO
                    const detectedCompany = normalizeCompany(data[0].from_our_company);
                    setCompany(detectedCompany);

                    // Auto-resolve customer & address
                    if (data[0].customer_name) setCustomerName(data[0].customer_name.trim());
                    if (data[0].delivery_address) setDeliveryAddress(data[0].delivery_address.trim());

                    // Auto-resolve PO Number and PO Date from tags
                    for (const o of data) {
                        const poInfo = parseOrderPoInfo(o.remarks);
                        if (poInfo.isTagged) {
                            if (poInfo.poNumber && !poNumber) setPoNumber(poInfo.poNumber);
                            if (poInfo.poDate && !poDate) setPoDate(poInfo.poDate);
                        }
                    }
                }
            } catch (err: any) {
                console.error('Error loading orders:', err);
                setFeedback({ type: 'error', message: err.message || 'Failed to load selected orders.' });
            } finally {
                setLoading(false);
            }
        })();
    }, [idsParam]);

    // Line items state with full HSN, GST rate, and Material Code editing
    const [editableItems, setEditableItems] = useState<{
        orderId: string | number;
        materialCode: string;
        exactPoName: string;
        packingDetail: string;
        hsn: string;
        gstRate: number;
        deliveryQty: number;
        rate: number;
        amount: number;
        isProcessing?: boolean;
    }[]>([]);

    const detectDefaultHsnAndGst = (productName: string, artworkCode?: string) => {
        const p = (productName || '').toLowerCase();
        const ac = (artworkCode || '').toLowerCase();

        // Leaflet / Insert -> 49011020, 5%
        if (p.includes('insert') || p.includes('leaflet') || p.includes('outsert') || p.includes('pil') || ac.includes('/i')) {
            return { hsn: '49011020', gstRate: 5 };
        }
        // Label -> 48211020, 18%
        if (p.includes('label') || p.includes('sticker') || ac.includes('/l')) {
            return { hsn: '48211020', gstRate: 18 };
        }
        // Carton -> 48192010, 5%
        if (p.includes('carton') || p.includes('box') || p.includes('outer') || ac.includes('/c')) {
            return { hsn: '48192010', gstRate: 5 };
        }
        return { hsn: '48192010', gstRate: 5 };
    };

    useEffect(() => {
        if (!orders || orders.length === 0) return;

        setEditableItems(prevItems => {
            const newItems = orders.map(o => {
                const poInfo = parseOrderPoInfo(o.remarks, o.rate);
                const exactPoName = poInfo.isTagged && poInfo.poItemName ? poInfo.poItemName : (o.product_name || 'Item');
                const rate = poInfo.isTagged && poInfo.rate ? poInfo.rate : (o.rate || 0);
                const deliveryQty = o.qty_delivered || o.quantity || 0;
                const materialCode = poInfo.materialCode || '';
                const defaultHsnGst = detectDefaultHsnAndGst(o.product_name, o.products?.artwork_code);

                // Preserve existing user customization if already edited
                const existing = prevItems.find(it => String(it.orderId) === String(o.id));
                const finalHsn = existing ? existing.hsn : defaultHsnGst.hsn;
                const finalGst = existing ? existing.gstRate : defaultHsnGst.gstRate;
                const finalQty = existing ? existing.deliveryQty : deliveryQty;
                const finalRate = existing ? existing.rate : rate;
                const finalPacking = existing ? existing.packingDetail : (o.packing_detail || '');
                const finalMatCode = existing ? existing.materialCode : materialCode;
                const finalName = existing ? existing.exactPoName : exactPoName;

                return {
                    orderId: o.id,
                    materialCode: finalMatCode,
                    exactPoName: finalName,
                    packingDetail: finalPacking,
                    hsn: finalHsn,
                    gstRate: finalGst,
                    deliveryQty: finalQty,
                    rate: finalRate,
                    amount: Math.round(finalQty * finalRate * 100) / 100,
                    isProcessing: false,
                };
            });

            // Add separate line item for processing charges if enabled
            if (processingChargeState.enabled && processingChargeState.amount > 0) {
                const q = processingChargeState.qty || 1;
                const r = processingChargeState.amount;
                const existingProc = prevItems.find(it => it.orderId === 'proc-charge-line');
                newItems.push({
                    orderId: 'proc-charge-line',
                    materialCode: '',
                    exactPoName: processingChargeState.name || 'Label Processing Charges',
                    packingDetail: '-',
                    hsn: existingProc ? existingProc.hsn : '48211020',
                    gstRate: existingProc ? existingProc.gstRate : 18,
                    deliveryQty: q,
                    rate: r,
                    amount: Math.round(q * r * 100) / 100,
                    isProcessing: true,
                });
            }

            return newItems;
        });
    }, [orders, processingChargeState]);

    const handleUpdateItem = (orderId: string | number, field: string, value: any) => {
        setEditableItems(prev => prev.map(item => {
            if (item.orderId !== orderId) return item;
            const updated: any = { ...item, [field]: value };
            if (field === 'hsn') {
                if (value === '48192010') updated.gstRate = 5;
                else if (value === '48211020') updated.gstRate = 18;
                else if (value === '49011020') updated.gstRate = 5;
            }
            if (field === 'deliveryQty' || field === 'rate') {
                const q = field === 'deliveryQty' ? parseFloat(value) || 0 : item.deliveryQty;
                const r = field === 'rate' ? parseFloat(value) || 0 : item.rate;
                updated.amount = Math.round(q * r * 100) / 100;
            }
            return updated;
        }));
    };

    // Calculate dynamic Tax Breakdown (supporting mixed 5% and 18% items)
    const taxBreakdown = useMemo(() => {
        let subtotal = 0;
        let taxable5 = 0;
        let tax5 = 0;
        let taxable18 = 0;
        let tax18 = 0;

        for (const it of editableItems) {
            const amt = Math.round((Number(it.deliveryQty || 0) * Number(it.rate || 0)) * 100) / 100;
            subtotal += amt;
            if (Number(it.gstRate) === 5) {
                taxable5 += amt;
                tax5 += Math.round(amt * 0.05 * 100) / 100;
            } else {
                taxable18 += amt;
                tax18 += Math.round(amt * 0.18 * 100) / 100;
            }
        }

        const totalTax = Math.round((tax5 + tax18) * 100) / 100;
        const grandTotal = Math.round((subtotal + totalTax) * 100) / 100;

        return {
            subtotal: Math.round(subtotal * 100) / 100,
            taxable5: Math.round(taxable5 * 100) / 100,
            tax5: Math.round(tax5 * 100) / 100,
            taxable18: Math.round(taxable18 * 100) / 100,
            tax18: Math.round(tax18 * 100) / 100,
            totalTax,
            grandTotal,
        };
    }, [editableItems]);

    // Format Printable Line Items
    const invoiceItems: InvoiceCopyItem[] = useMemo(() => {
        return editableItems.map(it => ({
            orderId: it.orderId,
            materialCode: it.materialCode,
            exactPoName: it.exactPoName,
            packingDetail: it.packingDetail,
            hsn: it.hsn,
            gstRate: it.gstRate,
            deliveryQty: it.deliveryQty,
            rate: it.rate,
            amount: it.amount,
        }));
    }, [editableItems]);

    const subtotal = taxBreakdown.subtotal;
    const taxAmount = taxBreakdown.totalTax;
    const grandTotal = taxBreakdown.grandTotal;

    const handlePrint = () => {
        window.print();
    };

    const handleCreateZohoInvoice = async () => {
        setIsCreatingZoho(true);
        setFeedback(null);
        try {
            const payload = {
                billFromCompany: company,
                invoiceNo,
                invoiceDate,
                poNumber,
                poDate,
                noOfBoxes,
                customerName,
                deliveryAddress,
                taxType,
                items: editableItems.map(it => ({
                    orderId: it.orderId,
                    materialCode: it.materialCode,
                    name: it.exactPoName,
                    packingDetail: it.packingDetail,
                    description: it.packingDetail && it.packingDetail !== '-' ? it.packingDetail : '',
                    quantity: it.deliveryQty,
                    rate: it.rate,
                    hsn_or_sac: it.hsn,
                    tax_percentage: it.gstRate,
                    item_total: it.amount,
                })),
                subtotal,
                taxAmount,
                grandTotal,
            };

            const res = await fetch('/api/zoho/create-invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed to create invoice in Zoho Books.');

            setFeedback({
                type: 'success',
                message: json.message || 'Invoice created successfully in Zoho Books!',
                url: json.invoiceUrl,
            });
        } catch (err: any) {
            console.error('Zoho error:', err);
            setFeedback({ type: 'error', message: err.message || 'Error communicating with Zoho Books.' });
        } finally {
            setIsCreatingZoho(false);
        }
    };

    // Mapping for COATemplate companyType
    const coaCompanyType = useMemo<'Packaging' | 'Printers' | 'Enterprise'>(() => {
        if (company.includes('Printer')) return 'Printers';
        if (company.includes('Enterprise')) return 'Enterprise';
        return 'Packaging';
    }, [company]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
                <p className="text-sm font-bold text-slate-700">Compiling 3-Copy Invoice & COA Documents...</p>
            </div>
        );
    }

    if (!idsParam || orders.length === 0) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <AlertCircle className="w-10 h-10 text-amber-500 mb-3" />
                <h2 className="text-lg font-bold text-slate-800">No Orders Selected</h2>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">Please select orders to generate dispatch documents.</p>
                <Link href="/orders" className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700">
                    Back to Orders
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-200 print:bg-white text-slate-900 font-sans pb-16 print:p-0 print:pb-0">

            {/* Print Styling Override for Multi-Page Triplicate + COA */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 0;
                    }
                    body {
                        background-color: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .invoice-copy-page, .coa-container {
                        width: 210mm !important;
                        min-height: 297mm !important;
                        margin: 0 auto !important;
                        box-shadow: none !important;
                        border: none !important;
                        break-after: page !important;
                        page-break-after: always !important;
                    }
                }
            `}} />

            {/* Sticky Floating Control Header (Screen Only) */}
            <header className="no-print sticky top-0 z-50 bg-slate-900 text-white shadow-xl border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => router.push('/orders')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Back to Orders
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-sm font-black uppercase tracking-wide">Dispatch Documents Package</h1>
                                <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-400/30">
                                    3 Invoices + {orders.length} COA
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Billing from: </span>
                                <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                                    {company}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Controls & Action Buttons */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Invoice No, Date, PO No, PO Date, Boxes */}
                        <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 text-xs flex-wrap">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Inv No:</span>
                            <input
                                value={invoiceNo}
                                onChange={e => setInvoiceNo(e.target.value)}
                                className="w-24 bg-transparent text-white font-mono font-bold text-xs focus:outline-none"
                            />
                            <span className="text-slate-600">|</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Date:</span>
                            <input
                                value={invoiceDate}
                                onChange={e => setInvoiceDate(e.target.value)}
                                className="w-24 bg-transparent text-white font-bold text-xs focus:outline-none"
                            />
                            <span className="text-slate-600">|</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">PO No:</span>
                            <input
                                value={poNumber}
                                placeholder="e.g. 4110023604"
                                onChange={e => setPoNumber(e.target.value)}
                                className="w-24 bg-transparent text-indigo-300 font-mono font-bold text-xs focus:outline-none"
                            />
                            <span className="text-slate-600">|</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">PO Date:</span>
                            <input
                                value={poDate}
                                placeholder="DD/MM/YYYY"
                                onChange={e => setPoDate(e.target.value)}
                                className="w-24 bg-transparent text-white font-bold text-xs focus:outline-none"
                            />
                            <span className="text-slate-600">|</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Boxes:</span>
                            <input
                                value={noOfBoxes}
                                placeholder="e.g. 16"
                                onChange={e => setNoOfBoxes(e.target.value)}
                                className="w-14 bg-transparent text-white font-bold text-xs focus:outline-none"
                            />
                        </div>

                        {/* Processing Charges Pill with Edit Option */}
                        <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 text-xs">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Processing:</span>
                            {processingChargeState.enabled && processingChargeState.amount > 0 ? (
                                <span className="text-amber-400 font-bold">
                                    {processingChargeState.qty} x ₹{processingChargeState.amount} (₹{(processingChargeState.qty * processingChargeState.amount).toLocaleString()})
                                </span>
                            ) : (
                                <span className="text-slate-400">None</span>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    setTempChoice(processingChargeState.enabled ? 'yes' : 'no');
                                    setTempQty(String(processingChargeState.qty || 1));
                                    setTempAmount(processingChargeState.amount > 0 ? String(processingChargeState.amount) : '');
                                    setTempName(processingChargeState.name || 'Label Processing Charges');
                                    setShowEditProcessingModal(true);
                                }}
                                className="ml-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-bold underline cursor-pointer"
                            >
                                Edit
                            </button>
                        </div>

                        {/* Print / Save PDF Button */}
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
                        >
                            <Printer className="w-4 h-4" />
                            Print / Save PDF (Triplicate + COAs)
                        </button>

                        {/* Zoho Sync Button */}
                        <button
                            type="button"
                            onClick={handleCreateZohoInvoice}
                            disabled={isCreatingZoho}
                            className="inline-flex items-center gap-2 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                        >
                            {isCreatingZoho ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Syncing Zoho...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Zoho Books</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Feedback Alerts */}
                {feedback && (
                    <div className={`px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 ${
                        feedback.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                        {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                        <span>{feedback.message}</span>
                        {feedback.url && (
                            <a
                                href={feedback.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 underline bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded text-[11px] ml-2 font-bold cursor-pointer transition-colors"
                            >
                                View in Zoho Books &rarr;
                            </a>
                        )}
                    </div>
                )}
            </header>

            {/* Document Pages Container */}
            <main className="max-w-5xl mx-auto py-8 print:py-0 space-y-10 print:space-y-0">

                {/* ========================================================
                    INTERACTIVE INVOICE ITEMS, HSN & GST CONFIGURATION
                    (Screen only, hidden when printing)
                   ======================================================== */}
                <div className="no-print bg-white rounded-2xl shadow-xl border border-slate-300 overflow-hidden mb-6">
                    <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <span className="p-1.5 bg-indigo-600 rounded-lg text-white">
                                <FileCheck className="w-4 h-4" />
                            </span>
                            <div>
                                <h2 className="text-xs font-black uppercase tracking-wider">
                                    Invoice Items, HSN & GST Setup
                                </h2>
                                <p className="text-[10px] text-slate-400">
                                    HSN auto-assigned: Carton (48192010 - 5%), Label (48211020 - 18%), Leaflet (49011020 - 5%). Select or change below.
                                </p>
                            </div>
                        </div>

                        {/* Tax Type Selector: IGST vs CGST+SGST */}
                        <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
                            <span className="text-[10px] text-slate-400 font-bold uppercase px-1">GST Type:</span>
                            <button
                                type="button"
                                onClick={() => setTaxType('IGST')}
                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                                    taxType === 'IGST'
                                        ? 'bg-indigo-600 text-white shadow'
                                        : 'text-slate-300 hover:text-white'
                                }`}
                            >
                                IGST (Inter-State)
                            </button>
                            <button
                                type="button"
                                onClick={() => setTaxType('CGST_SGST')}
                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                                    taxType === 'CGST_SGST'
                                        ? 'bg-indigo-600 text-white shadow'
                                        : 'text-slate-300 hover:text-white'
                                }`}
                            >
                                CGST + SGST (Intra-State)
                            </button>
                        </div>
                    </div>

                    {/* Table of items */}
                    <div className="p-4 overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 text-slate-500 text-[10px] font-black uppercase bg-slate-50/50">
                                    <th className="py-2 px-2 w-8 text-center">#</th>
                                    <th className="py-2 px-2 min-w-[280px]">Material Code & Description</th>
                                    <th className="py-2 px-2 min-w-[220px]">HSN Code</th>
                                    <th className="py-2 px-2 w-20 text-center">GST %</th>
                                    <th className="py-2 px-2 w-24 text-right">Qty</th>
                                    <th className="py-2 px-2 w-24 text-right">Rate (₹)</th>
                                    <th className="py-2 px-2 w-28 text-right">Amount (₹)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {editableItems.map((item, idx) => (
                                    <tr key={item.orderId || idx} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="py-2.5 px-2 text-center font-bold text-slate-400">
                                            {idx + 1}
                                        </td>
                                        <td className="py-2.5 px-2 space-y-1">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] text-slate-500 font-bold uppercase shrink-0">Material Code:</span>
                                                <input
                                                    value={item.materialCode || ''}
                                                    placeholder="e.g. 2020000643"
                                                    onChange={e => handleUpdateItem(item.orderId, 'materialCode', e.target.value)}
                                                    className="w-36 bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                />
                                            </div>
                                            <input
                                                value={item.exactPoName}
                                                onChange={e => handleUpdateItem(item.orderId, 'exactPoName', e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            />
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] text-slate-500 font-semibold shrink-0">Packing Details:</span>
                                                <input
                                                    value={item.packingDetail}
                                                    placeholder="e.g. 1000 per roll / 500 per box"
                                                    onChange={e => handleUpdateItem(item.orderId, 'packingDetail', e.target.value)}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                />
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-2">
                                            <select
                                                value={item.hsn}
                                                onChange={e => handleUpdateItem(item.orderId, 'hsn', e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                            >
                                                <option value="48192010">48192010 - Carton (5% GST)</option>
                                                <option value="48211020">48211020 - Label (18% GST)</option>
                                                <option value="49011020">49011020 - Leaflet / Insert (5% GST)</option>
                                            </select>
                                        </td>
                                        <td className="py-2.5 px-2 text-center">
                                            <select
                                                value={item.gstRate}
                                                onChange={e => handleUpdateItem(item.orderId, 'gstRate', Number(e.target.value))}
                                                className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1 text-xs font-bold text-center text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                            >
                                                <option value={5}>5%</option>
                                                <option value={18}>18%</option>
                                                <option value={0}>0%</option>
                                                <option value={12}>12%</option>
                                            </select>
                                        </td>
                                        <td className="py-2.5 px-2 text-right">
                                            <input
                                                type="number"
                                                value={item.deliveryQty}
                                                onChange={e => handleUpdateItem(item.orderId, 'deliveryQty', e.target.value)}
                                                className="w-20 text-right bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            />
                                        </td>
                                        <td className="py-2.5 px-2 text-right">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={item.rate}
                                                onChange={e => handleUpdateItem(item.orderId, 'rate', e.target.value)}
                                                className="w-20 text-right bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            />
                                        </td>
                                        <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-900">
                                            ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Tax Breakdown Bar */}
                    <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-4 text-slate-600">
                            <span>Subtotal: <strong className="text-slate-900 font-mono">₹{taxBreakdown.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                            {taxBreakdown.taxable5 > 0 && (
                                <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-medium">
                                    5% GST on ₹{taxBreakdown.taxable5.toLocaleString()}: <strong>₹{taxBreakdown.tax5.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                                </span>
                            )}
                            {taxBreakdown.taxable18 > 0 && (
                                <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-medium">
                                    18% GST on ₹{taxBreakdown.taxable18.toLocaleString()}: <strong>₹{taxBreakdown.tax18.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-slate-600">Total Tax: <strong className="text-slate-900 font-mono">₹{taxBreakdown.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                            <span className="bg-slate-900 text-white px-3 py-1 rounded-lg font-black text-xs font-mono">
                                Grand Total: ₹{taxBreakdown.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ========================================================
                    PART 1: INVOICE IN TRIPLICATE (3 COPIES)
                    1. Original for Recipient
                    2. Duplicate for Transporter
                    3. Triplicate for Supplier
                   ======================================================== */}
                <div className="space-y-10 print:space-y-0">
                    {/* Copy 1: Original */}
                    <div className="relative">
                        <div className="no-print text-center text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                            <span className="w-8 h-px bg-slate-300"></span>
                            Page 1: Invoice (Original for Recipient)
                            <span className="w-8 h-px bg-slate-300"></span>
                        </div>
                        <InvoicePrintableCopy
                            copyType="ORIGINAL FOR RECIPIENT"
                            company={company}
                            invoiceNo={invoiceNo}
                            invoiceDate={invoiceDate}
                            poNumber={poNumber}
                            poDate={poDate}
                            noOfBoxes={noOfBoxes}
                            customerName={customerName}
                            deliveryAddress={deliveryAddress}
                            taxType={taxType}
                            items={invoiceItems}
                            subtotal={subtotal}
                            taxAmount={taxAmount}
                            grandTotal={grandTotal}
                            taxBreakdown={taxBreakdown}
                        />
                    </div>

                    {/* Copy 2: Duplicate */}
                    <div className="relative">
                        <div className="no-print text-center text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                            <span className="w-8 h-px bg-slate-300"></span>
                            Page 2: Invoice (Duplicate for Transporter)
                            <span className="w-8 h-px bg-slate-300"></span>
                        </div>
                        <InvoicePrintableCopy
                            copyType="DUPLICATE FOR TRANSPORTER"
                            company={company}
                            invoiceNo={invoiceNo}
                            invoiceDate={invoiceDate}
                            poNumber={poNumber}
                            poDate={poDate}
                            noOfBoxes={noOfBoxes}
                            customerName={customerName}
                            deliveryAddress={deliveryAddress}
                            taxType={taxType}
                            items={invoiceItems}
                            subtotal={subtotal}
                            taxAmount={taxAmount}
                            grandTotal={grandTotal}
                            taxBreakdown={taxBreakdown}
                        />
                    </div>

                    {/* Copy 3: Triplicate */}
                    <div className="relative">
                        <div className="no-print text-center text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                            <span className="w-8 h-px bg-slate-300"></span>
                            Page 3: Invoice (Triplicate for Supplier)
                            <span className="w-8 h-px bg-slate-300"></span>
                        </div>
                        <InvoicePrintableCopy
                            copyType="TRIPLICATE FOR SUPPLIER"
                            company={company}
                            invoiceNo={invoiceNo}
                            invoiceDate={invoiceDate}
                            poNumber={poNumber}
                            poDate={poDate}
                            noOfBoxes={noOfBoxes}
                            customerName={customerName}
                            deliveryAddress={deliveryAddress}
                            taxType={taxType}
                            items={invoiceItems}
                            subtotal={subtotal}
                            taxAmount={taxAmount}
                            grandTotal={grandTotal}
                            taxBreakdown={taxBreakdown}
                        />
                    </div>
                </div>

                {/* ========================================================
                    PART 2: CERTIFICATE OF ANALYSIS (COA) FOR EACH ORDER
                   ======================================================== */}
                <div className="space-y-10 print:space-y-0 pt-4">
                    <div className="no-print border-t-2 border-dashed border-slate-300 pt-6 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800 text-white text-xs font-black uppercase tracking-wider shadow">
                            <FileCheck className="w-4 h-4 text-emerald-400" />
                            Certificates of Analysis ({orders.length} Products) &bull; {company}
                        </div>
                    </div>

                    {orders.map((order, idx) => {
                        // Merge product master specs into order object for accurate COA rendering
                        const mergedOrder: Order = {
                            ...order,
                            invoice_no: invoiceNo,
                            customer_name: customerName,
                            delivery_address: deliveryAddress || order.delivery_address,
                            from_our_company: coaCompanyType,
                            // Fallbacks from products
                            product_name: order.products?.product_name || order.product_name,
                            artwork_code: order.products?.artwork_code || order.artwork_code,
                            dimension: order.products?.dimension || order.dimension,
                            folding_dim: order.products?.folding_dim || order.folding_dim,
                            specs: order.products?.specs || order.specs,
                            specification: order.products?.specifications?.name || order.specification,
                            construction: order.products?.constructions?.name || order.construction,
                            gsm_value: order.products?.gsm?.name || order.gsm_value,
                            paper_type_name: order.products?.paper_types?.name || order.paper_type_name,
                        };

                        return (
                            <div key={order.id} className="relative" style={{ breakAfter: 'page', pageBreakAfter: 'always' }}>
                                <div className="no-print text-center text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                                    <span className="w-8 h-px bg-slate-300"></span>
                                    Page {idx + 4}: COA &mdash; {mergedOrder.product_name}
                                    <span className="w-8 h-px bg-slate-300"></span>
                                </div>
                                <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden print:border-none print:shadow-none print:rounded-none">
                                    <COATemplate
                                        order={mergedOrder}
                                        companyType={coaCompanyType}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

            </main>

            {/* Mandatory Processing Charges Step Modal (Guarantees user cannot bypass without answering) */}
            {(!processingChargeState.decided || showEditProcessingModal) && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
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
                            {processingChargeState.decided && (
                                <button
                                    type="button"
                                    onClick={() => setShowEditProcessingModal(false)}
                                    className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Body */}
                        <div className="p-5 space-y-4">
                            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                                <p className="font-bold">Add processing charges as a separate line item?</p>
                                <p className="text-[11px] text-amber-800 mt-1">
                                    This must be added apart from the actual label quantity and rate as a separate line item. Without this step, you cannot proceed with invoice & COA generation.
                                </p>
                            </div>

                            {/* Yes / No Options */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setTempChoice('no')}
                                    className={`p-3.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                                        tempChoice === 'no'
                                            ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                    }`}
                                >
                                    <span className="text-base">❌ No</span>
                                    <span className="text-[10px] opacity-80">No Processing Charges</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setTempChoice('yes')}
                                    className={`p-3.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                                        tempChoice === 'yes'
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-500/20'
                                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                    }`}
                                >
                                    <span className="text-base">✅ Yes</span>
                                    <span className="text-[10px] opacity-80">Add Separate Line Item</span>
                                </button>
                            </div>

                            {/* Inputs if Yes is selected */}
                            {tempChoice === 'yes' && (
                                <div className="space-y-3 pt-3 border-t border-slate-200 animate-in fade-in slide-in-from-top-2">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                                            Item Description
                                        </label>
                                        <input
                                            type="text"
                                            value={tempName}
                                            onChange={e => setTempName(e.target.value)}
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
                                                value={tempQty}
                                                onChange={e => setTempQty(e.target.value)}
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
                                                value={tempAmount}
                                                onChange={e => setTempAmount(e.target.value)}
                                                placeholder="e.g. 1500"
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-indigo-700 focus:bg-white focus:outline-none focus:border-indigo-500"
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    {tempQty && tempAmount && Number(tempAmount) > 0 && (
                                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-2.5 text-xs flex justify-between items-center text-indigo-950 font-bold">
                                            <span>Invoice Line Total:</span>
                                            <span className="text-sm font-black text-indigo-700">
                                                ₹{(Number(tempQty) * Number(tempAmount)).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                            {!processingChargeState.decided ? (
                                <button
                                    type="button"
                                    onClick={() => router.push('/orders')}
                                    className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                                >
                                    Cancel & Return
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setShowEditProcessingModal(false)}
                                    className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                                >
                                    Close
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => {
                                    if (tempChoice === 'yes') {
                                        setProcessingChargeState({
                                            decided: true,
                                            enabled: true,
                                            qty: parseFloat(tempQty) || 1,
                                            amount: parseFloat(tempAmount) || 0,
                                            name: tempName.trim() || 'Label Processing Charges',
                                        });
                                    } else if (tempChoice === 'no') {
                                        setProcessingChargeState({
                                            decided: true,
                                            enabled: false,
                                            qty: 1,
                                            amount: 0,
                                            name: 'Label Processing Charges',
                                        });
                                    }
                                    setShowEditProcessingModal(false);
                                }}
                                disabled={
                                    !tempChoice ||
                                    (tempChoice === 'yes' && (!tempAmount || Number(tempAmount) <= 0 || !tempQty || Number(tempQty) <= 0))
                                }
                                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-extrabold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                            >
                                <span>Apply to Documents</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function DispatchDocumentsPage() {
    return (
        <Suspense fallback={<div className="p-12 text-center text-xs font-bold text-slate-500">Loading Dispatch Package...</div>}>
            <DispatchDocumentsContent />
        </Suspense>
    );
}
