'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { Order } from '@/types';
import { ArrowLeft, Building, FileText, CheckCircle2, AlertCircle, Printer, Download, Sparkles, Send, Loader2, Package, MapPin } from 'lucide-react';
import Link from 'next/link';

interface InvoiceItemState {
    orderId: number | string;
    productName: string;
    artworkCode?: string;
    exactPoName: string;
    poNumber: string;
    deliveryQty: number;
    packingDetail: string;
    rate: number;
    hsn: string;
    taxPercent: number;
    amount: number;
}

function InvoiceContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const idsParam = searchParams.get('ids') || '';

    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<Order[]>([]);
    const [items, setItems] = useState<InvoiceItemState[]>([]);

    // Invoice Header Settings
    const [billFromCompany, setBillFromCompany] = useState<'Creative Packaging' | 'Creative Printers' | 'Creative Enterprise'>('Creative Packaging');
    const [invoiceNo, setInvoiceNo] = useState(`INV-${Date.now().toString().slice(-5)}`);
    const [invoiceDate, setInvoiceDate] = useState(() => {
        const d = new Date();
        return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    });
    const [poNumber, setPoNumber] = useState('');
    const [customerName, setCustomerName] = useState('BDR Pharmaceuticals International Pvt. Ltd.');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [taxType, setTaxType] = useState<'IGST' | 'CGST_SGST'>('IGST');

    // UI feedback
    const [isCreatingZoho, setIsCreatingZoho] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
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
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .in('id', ids);

            if (error) {
                console.error(error);
                setFeedback({ type: 'error', message: 'Failed to load selected orders.' });
            } else if (data) {
                setOrders(data);

                // Auto-detect billing company
                const firstCompany = data[0]?.from_our_company?.toLowerCase() || '';
                if (firstCompany.includes('print')) setBillFromCompany('Creative Printers');
                else if (firstCompany.includes('enter')) setBillFromCompany('Creative Enterprise');
                else setBillFromCompany('Creative Packaging');

                // Customer and delivery address
                if (data[0]?.customer_name) setCustomerName(data[0].customer_name.trim());
                if (data[0]?.delivery_address) setDeliveryAddress(data[0].delivery_address.trim());

                // Detect PO tags from remarks
                let detectedPo = '';
                const initialItems: InvoiceItemState[] = data.map(o => {
                    let exactName = o.product_name || 'Item';
                    let itemPo = '';
                    let itemRate = o.rate || 0;

                    // Parse [PO:...|Item:...|Rate:...]
                    if (o.remarks && o.remarks.includes('[PO:')) {
                        const poMatch = o.remarks.match(/\[PO:([^|]+)\|Item:([^|]+)\|Rate:([^|]+)/);
                        if (poMatch) {
                            itemPo = poMatch[1].trim();
                            exactName = poMatch[2].trim();
                            itemRate = parseFloat(poMatch[3]) || itemRate;
                            if (!detectedPo) detectedPo = itemPo;
                        }
                    }

                    const qty = o.qty_delivered || o.ready_delivery || o.quantity || 0;
                    const amount = (qty || 0) * (itemRate || 0);

                    // Auto HSN: Cartons (48192020), Labels (48211010), Inserts (49011010)
                    let hsn = '4819';
                    const pLower = (o.product_name || '').toLowerCase();
                    if (pLower.includes('label')) hsn = '4821';
                    if (pLower.includes('insert') || pLower.includes('leaflet')) hsn = '4901';

                    return {
                        orderId: o.id,
                        productName: o.product_name || '',
                        artworkCode: o.artwork_code || '',
                        exactPoName: exactName,
                        poNumber: itemPo || detectedPo,
                        deliveryQty: qty,
                        packingDetail: o.packing_detail || '',
                        rate: itemRate,
                        hsn,
                        taxPercent: 18,
                        amount: Math.round(amount * 100) / 100,
                    };
                });

                if (detectedPo) setPoNumber(detectedPo);
                setItems(initialItems);
            }
            setLoading(false);
        })();
    }, [idsParam]);

    const handleItemChange = (index: number, field: keyof InvoiceItemState, value: any) => {
        setItems(prev => {
            const next = [...prev];
            const target = { ...next[index], [field]: value };

            if (field === 'deliveryQty' || field === 'rate') {
                const q = field === 'deliveryQty' ? parseFloat(value) || 0 : target.deliveryQty;
                const r = field === 'rate' ? parseFloat(value) || 0 : target.rate;
                target.amount = Math.round(q * r * 100) / 100;
            }

            next[index] = target;
            return next;
        });
    };

    // Subtotal and tax totals
    const subtotal = useMemo(() => items.reduce((sum, it) => sum + (it.amount || 0), 0), [items]);
    const taxAmount = useMemo(() => Math.round(subtotal * 0.18 * 100) / 100, [subtotal]);
    const grandTotal = useMemo(() => Math.round((subtotal + taxAmount) * 100) / 100, [subtotal, taxAmount]);

    const handlePrintInvoice = () => {
        window.print();
    };

    const handleCreateZohoInvoice = async () => {
        setIsCreatingZoho(true);
        setFeedback(null);

        try {
            // Send payload to Zoho API
            const payload = {
                billFromCompany,
                invoiceNo,
                invoiceDate,
                poNumber,
                customerName,
                deliveryAddress,
                taxType,
                items: items.map(it => ({
                    orderId: it.orderId,
                    name: it.exactPoName,
                    description: it.packingDetail ? `Packing Details: ${it.packingDetail}` : '',
                    quantity: it.deliveryQty,
                    rate: it.rate,
                    hsn_or_sac: it.hsn,
                    tax_percentage: it.taxPercent,
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
            if (!res.ok) {
                throw new Error(json.error || 'Failed to create invoice in Zoho Books.');
            }

            setFeedback({ type: 'success', message: json.message || 'Invoice created successfully in Zoho Books!' });
        } catch (err: any) {
            console.error('Zoho invoice error:', err);
            setFeedback({ type: 'error', message: err.message || 'Error communicating with Zoho Books.' });
        } finally {
            setIsCreatingZoho(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
                <p className="text-sm font-bold text-slate-700">Loading invoice details...</p>
            </div>
        );
    }

    if (!idsParam || orders.length === 0) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
                <AlertCircle className="w-10 h-10 text-amber-500 mb-3" />
                <h2 className="text-lg font-bold text-slate-800">No Orders Selected</h2>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">Please select orders from the orders list to generate an invoice.</p>
                <Link href="/orders" className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700">
                    Back to Orders
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8 print:p-0 print:bg-white text-slate-900 font-sans">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Back & Actions Header (Hidden on Print) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
                    <button
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Orders
                    </button>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        <button
                            onClick={handlePrintInvoice}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm active:scale-95 cursor-pointer"
                        >
                            <Printer className="w-4 h-4" />
                            Print / PDF (3 Copies)
                        </button>

                        <button
                            onClick={handleCreateZohoInvoice}
                            disabled={isCreatingZoho}
                            className="inline-flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/30 transition-all active:scale-95 cursor-pointer"
                        >
                            {isCreatingZoho ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Syncing Zoho...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    <span>Create in Zoho Books</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Feedback Alerts */}
                {feedback && (
                    <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 print:hidden ${
                        feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                        {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
                        <span>{feedback.message}</span>
                    </div>
                )}

                {/* Printable Invoice Container */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden print:border-none print:shadow-none print:rounded-none">
                    
                    {/* Invoice Header */}
                    <div className="p-6 md:p-8 border-b border-slate-200 bg-slate-900 text-white">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div>
                                <span className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase">Tax Invoice</span>
                                <div className="mt-1 flex items-center gap-2">
                                    <Building className="w-5 h-5 text-indigo-400" />
                                    <select
                                        value={billFromCompany}
                                        onChange={e => setBillFromCompany(e.target.value as any)}
                                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1 text-sm font-extrabold text-white print:border-none print:bg-transparent print:p-0"
                                    >
                                        <option value="Creative Packaging">Creative Packaging</option>
                                        <option value="Creative Printers">Creative Printers</option>
                                        <option value="Creative Enterprise">Creative Enterprise</option>
                                    </select>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">14, Parshva Sadan, 228 Dr. Annie Besant Road, Worli, Mumbai - 400030</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-right">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Invoice No</span>
                                    <input
                                        value={invoiceNo}
                                        onChange={e => setInvoiceNo(e.target.value)}
                                        className="w-28 text-right bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs font-bold text-white print:border-none print:bg-transparent"
                                    />
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Date</span>
                                    <input
                                        value={invoiceDate}
                                        onChange={e => setInvoiceDate(e.target.value)}
                                        className="w-24 text-right bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs font-bold text-white print:border-none print:bg-transparent"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <span className="text-[10px] font-bold text-indigo-300 uppercase">Buyer PO Number: </span>
                                    <input
                                        value={poNumber}
                                        onChange={e => setPoNumber(e.target.value)}
                                        placeholder="PO #"
                                        className="w-36 text-right bg-slate-800 border border-indigo-500/50 rounded px-2 py-0.5 text-xs font-bold text-indigo-200 print:border-none print:bg-transparent"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bill To & Ship To Details */}
                    <div className="p-6 md:p-8 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                        <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bill To (Buyer)</span>
                            <input
                                value={customerName}
                                onChange={e => setCustomerName(e.target.value)}
                                className="w-full font-bold text-slate-900 bg-white border border-slate-300 rounded px-2.5 py-1 text-xs print:border-none print:bg-transparent print:p-0"
                            />
                            <textarea
                                value={deliveryAddress}
                                onChange={e => setDeliveryAddress(e.target.value)}
                                rows={2}
                                placeholder="Buyer Address (Padra / Halol)"
                                className="w-full text-slate-600 bg-white border border-slate-300 rounded px-2.5 py-1 text-xs print:border-none print:bg-transparent print:p-0 resize-none"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ship To (Consignee)</span>
                            <div className="text-slate-700 font-semibold p-2.5 bg-white border border-slate-200 rounded text-xs print:border-none print:p-0">
                                {deliveryAddress || 'Same as Buyer Address'}
                            </div>
                            <div className="flex items-center gap-2 pt-1 print:hidden">
                                <span className="text-[11px] font-semibold text-slate-500">Tax Type:</span>
                                <label className="inline-flex items-center gap-1 cursor-pointer">
                                    <input
                                        type="radio"
                                        checked={taxType === 'IGST'}
                                        onChange={() => setTaxType('IGST')}
                                    />
                                    <span className="font-bold text-indigo-700">IGST 18%</span>
                                </label>
                                <label className="inline-flex items-center gap-1 cursor-pointer ml-3">
                                    <input
                                        type="radio"
                                        checked={taxType === 'CGST_SGST'}
                                        onChange={() => setTaxType('CGST_SGST')}
                                    />
                                    <span className="font-bold text-indigo-700">CGST + SGST (9% + 9%)</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Line Items Table */}
                    <div className="p-6 md:p-8 overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b-2 border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                                    <th className="py-2.5 px-2">#</th>
                                    <th className="py-2.5 px-2">Description & Packing Details</th>
                                    <th className="py-2.5 px-2">HSN</th>
                                    <th className="py-2.5 px-2 text-right">Delivery Qty</th>
                                    <th className="py-2.5 px-2 text-right">Rate (₹)</th>
                                    <th className="py-2.5 px-2 text-right">Amount (₹)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {items.map((item, idx) => (
                                    <tr key={item.orderId} className="hover:bg-slate-50/50">
                                        <td className="py-3 px-2 font-bold text-slate-400 align-top">{idx + 1}</td>
                                        <td className="py-3 px-2 space-y-1 align-top">
                                            {/* Exact PO Name */}
                                            <input
                                                value={item.exactPoName}
                                                onChange={e => handleItemChange(idx, 'exactPoName', e.target.value)}
                                                className="w-full font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white text-xs px-1 py-0.5 rounded"
                                                title="Exact name as per PO"
                                            />
                                            {/* Packing Details under description */}
                                            <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                                                <Package className="w-3 h-3 text-amber-600 shrink-0" />
                                                <input
                                                    value={item.packingDetail}
                                                    onChange={e => handleItemChange(idx, 'packingDetail', e.target.value)}
                                                    placeholder="Enter Packing Details..."
                                                    className="w-full text-slate-700 bg-amber-50/50 border border-amber-200 rounded px-1.5 py-0.5 text-[11px] font-medium"
                                                />
                                            </div>
                                        </td>
                                        <td className="py-3 px-2 align-top">
                                            <input
                                                value={item.hsn}
                                                onChange={e => handleItemChange(idx, 'hsn', e.target.value)}
                                                className="w-16 bg-transparent border-b border-transparent hover:border-slate-300 text-xs text-slate-700 px-1 py-0.5"
                                            />
                                        </td>
                                        <td className="py-3 px-2 text-right align-top">
                                            <input
                                                type="number"
                                                value={item.deliveryQty}
                                                onChange={e => handleItemChange(idx, 'deliveryQty', e.target.value)}
                                                className="w-24 text-right font-bold text-slate-900 bg-indigo-50 border border-indigo-200 rounded px-2 py-1 text-xs"
                                            />
                                        </td>
                                        <td className="py-3 px-2 text-right align-top">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={item.rate}
                                                onChange={e => handleItemChange(idx, 'rate', e.target.value)}
                                                className="w-20 text-right font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs"
                                            />
                                        </td>
                                        <td className="py-3 px-2 text-right font-bold text-slate-900 align-top">
                                            ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Tax & Grand Total Summary */}
                    <div className="p-6 md:p-8 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 text-xs">
                        <div className="text-slate-500 max-w-sm space-y-1">
                            <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Declaration</p>
                            <p className="text-[11px]">We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
                        </div>

                        <div className="w-full md:w-72 space-y-2">
                            <div className="flex justify-between text-slate-600">
                                <span>Sub Total:</span>
                                <span className="font-bold text-slate-900">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>

                            {taxType === 'IGST' ? (
                                <div className="flex justify-between text-slate-600">
                                    <span>IGST (18%):</span>
                                    <span className="font-bold text-slate-900">₹{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between text-slate-600">
                                        <span>CGST (9%):</span>
                                        <span className="font-bold text-slate-900">₹{(taxAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-600">
                                        <span>SGST (9%):</span>
                                        <span className="font-bold text-slate-900">₹{(taxAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </>
                            )}

                            <div className="flex justify-between text-sm font-extrabold text-indigo-900 border-t-2 border-slate-300 pt-2">
                                <span>Grand Total:</span>
                                <span>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>

                    {/* 3-Copy Dispatch Notice (Print Only) */}
                    <div className="hidden print:block p-6 border-t border-slate-200 text-center text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                        1. Original for Recipient &bull; 2. Duplicate for Transporter &bull; 3. Triplicate for Supplier
                    </div>

                </div>

            </div>
        </div>
    );
}

export default function InvoicePage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-slate-500">Loading invoice...</div>}>
            <InvoiceContent />
        </Suspense>
    );
}
