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
    FileCheck
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
    const [customerName, setCustomerName] = useState('BDR Pharmaceuticals International Pvt. Ltd.');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [taxType, setTaxType] = useState<'IGST' | 'CGST_SGST'>('IGST');

    // Zoho Sync state
    const [isCreatingZoho, setIsCreatingZoho] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

                    // Auto-resolve PO Number from tags
                    for (const o of data) {
                        const poInfo = parseOrderPoInfo(o.remarks);
                        if (poInfo.isTagged && poInfo.poNumber) {
                            setPoNumber(poInfo.poNumber);
                            break;
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

    // Format Invoice Line Items
    const invoiceItems: InvoiceCopyItem[] = useMemo(() => {
        return orders.map(o => {
            const poInfo = parseOrderPoInfo(o.remarks, o.rate);
            const exactPoName = poInfo.isTagged ? poInfo.poItemName : (o.product_name || 'Item');
            const rate = poInfo.isTagged ? poInfo.rate : (o.rate || 0);
            const deliveryQty = o.qty_delivered || o.quantity || 0;
            const amount = Math.round(deliveryQty * rate * 100) / 100;

            // Auto HSN
            let hsn = '4819';
            const pLower = (o.product_name || '').toLowerCase();
            if (pLower.includes('label')) hsn = '4821';
            if (pLower.includes('insert') || pLower.includes('leaflet')) hsn = '4901';

            return {
                orderId: o.id,
                exactPoName,
                packingDetail: o.packing_detail || '',
                hsn,
                deliveryQty,
                rate,
                amount,
            };
        });
    }, [orders]);

    const subtotal = useMemo(() => {
        return invoiceItems.reduce((sum, it) => sum + (it.amount || 0), 0);
    }, [invoiceItems]);

    const taxAmount = useMemo(() => {
        return Math.round(subtotal * 0.18 * 100) / 100;
    }, [subtotal]);

    const grandTotal = useMemo(() => {
        return Math.round((subtotal + taxAmount) * 100) / 100;
    }, [subtotal, taxAmount]);

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
                customerName,
                deliveryAddress,
                taxType,
                items: invoiceItems.map(it => ({
                    orderId: it.orderId,
                    name: it.exactPoName,
                    description: it.packingDetail ? `Packing Details: ${it.packingDetail}` : '',
                    quantity: it.deliveryQty,
                    rate: it.rate,
                    hsn_or_sac: it.hsn,
                    tax_percentage: 18,
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

            setFeedback({ type: 'success', message: json.message || 'Invoice created successfully in Zoho Books!' });
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
                        {/* Invoice No & Date */}
                        <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700 text-xs">
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
                    </div>
                )}
            </header>

            {/* Document Pages Container */}
            <main className="max-w-5xl mx-auto py-8 print:py-0 space-y-10 print:space-y-0">

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
                            customerName={customerName}
                            deliveryAddress={deliveryAddress}
                            taxType={taxType}
                            items={invoiceItems}
                            subtotal={subtotal}
                            taxAmount={taxAmount}
                            grandTotal={grandTotal}
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
                            customerName={customerName}
                            deliveryAddress={deliveryAddress}
                            taxType={taxType}
                            items={invoiceItems}
                            subtotal={subtotal}
                            taxAmount={taxAmount}
                            grandTotal={grandTotal}
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
                            customerName={customerName}
                            deliveryAddress={deliveryAddress}
                            taxType={taxType}
                            items={invoiceItems}
                            subtotal={subtotal}
                            taxAmount={taxAmount}
                            grandTotal={grandTotal}
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
