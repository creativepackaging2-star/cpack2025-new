'use client';

import { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, Loader2, Building, MapPin, Tag, ChevronRight, Check } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';

interface POTaggingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface ParsedPoItem {
    itemNo?: string;
    materialCode?: string;
    exactPoName: string;
    hsn?: string;
    quantity?: number;
    uom?: string;
    rate?: number;
    deliveryDate?: string;
    matchedOrderId?: number | string | null;
}

interface OrderOption {
    id: number | string;
    order_id?: string;
    product_name?: string;
    artwork_code?: string;
    quantity?: number;
    rate?: number;
    packing_detail?: string;
}

export default function POTaggingModal({ isOpen, onClose, onSuccess }: POTaggingModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [parsing, setParsing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Parsed PO fields
    const [poNumber, setPoNumber] = useState('');
    const [poDate, setPoDate] = useState('');
    const [billFrom, setBillFrom] = useState<'Creative Packaging' | 'Creative Printers' | 'Creative Enterprise'>('Creative Packaging');
    const [billToUnit, setBillToUnit] = useState<'Padra' | 'Halol' | 'Unknown'>('Unknown');
    const [shipToUnit, setShipToUnit] = useState<'Padra' | 'Halol' | 'Same as Bill To' | 'Unknown'>('Unknown');
    const [billToText, setBillToText] = useState('');
    const [shipToText, setShipToText] = useState('');

    const [items, setItems] = useState<ParsedPoItem[]>([]);
    const [availableOrders, setAvailableOrders] = useState<OrderOption[]>([]);
    const [taggedOrders, setTaggedOrders] = useState<Record<number, string | number>>({}); // index -> orderId

    // Pre-fetch ONLY OPEN orders from Supabase as soon as modal opens
    useEffect(() => {
        if (!isOpen) return;
        (async () => {
            const { data } = await supabase
                .from('orders')
                .select('id, order_id, product_name, artwork_code, quantity, rate, packing_detail, customer_name, from_our_company, remarks, status')
                .neq('status', 'Complete')
                .neq('status', 'Delivered')
                .order('id', { ascending: false })
                .limit(250);

            if (data && data.length > 0) {
                const openOnly = data.filter(o => {
                    const s = (o.status || '').toLowerCase().trim();
                    return !s.includes('complete') && s !== 'delivered';
                });
                setAvailableOrders(openOnly);
            }
        })();
    }, [isOpen]);

    if (!isOpen) return null;

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setError(null);
        setParsing(true);

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const res = await fetch('/api/parse-po', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const text = await res.text();
                let errMsg = `Server returned status ${res.status}`;
                try {
                    const parsedErr = JSON.parse(text);
                    errMsg = parsedErr.error || errMsg;
                } catch {
                    errMsg = text.slice(0, 150) || errMsg;
                }
                throw new Error(errMsg);
            }

            const json = await res.json();
            const data = json.data;
            if (data) {
                setPoNumber(data.poNumber || '');
                setPoDate(data.poDate || '');
                if (data.billFromCompany && data.billFromCompany !== 'Unknown') {
                    setBillFrom(data.billFromCompany);
                }
                setBillToUnit(data.billTo?.unit || 'Unknown');
                setShipToUnit(data.shipTo?.unit || 'Unknown');
                setBillToText(data.billTo?.raw || '');
                setShipToText(data.shipTo?.raw || '');

                setItems(data.items || []);
                if (json.availableOrders && json.availableOrders.length > 0) {
                    const openOnly = json.availableOrders.filter((o: any) => {
                        const s = (o.status || '').toLowerCase().trim();
                        return !s.includes('complete') && s !== 'delivered';
                    });
                    setAvailableOrders(openOnly);
                }

                // Initial auto-matched map
                const initialMap: Record<number, string | number> = {};
                (data.items || []).forEach((item: ParsedPoItem, idx: number) => {
                    if (item.matchedOrderId) {
                        initialMap[idx] = item.matchedOrderId;
                    }
                });
                setTaggedOrders(initialMap);
            }
        } catch (err: any) {
            console.error('PO parse error:', err);
            setError(err.message || 'Error parsing PO file.');
        } finally {
            setParsing(false);
        }
    };

    const handleTagChange = (itemIdx: number, orderId: string) => {
        setTaggedOrders(prev => ({
            ...prev,
            [itemIdx]: orderId ? orderId : '',
        }));
    };

    const handleSaveTagging = async () => {
        setSaving(true);
        setError(null);

        try {
            const updates = [];

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const orderId = taggedOrders[i];

                if (orderId) {
                    // Look up matching order details
                    const matched = availableOrders.find(o => String(o.id) === String(orderId));
                    const companyMap: Record<string, string> = {
                        'Creative Packaging': 'Packaging',
                        'Creative Printers': 'Printers',
                        'Creative Enterprise': 'Enterprise',
                    };

                    const poTag = `[PO:${poNumber}|Item:${item.exactPoName}|Rate:${item.rate || matched?.rate || 0}|Code:${item.materialCode || ''}]`;
                    const currentRemarks = (matched as any)?.remarks || '';
                    const cleanRemarks = currentRemarks.replace(/\[PO:[^\]]+\]/g, '').trim();
                    const newRemarks = cleanRemarks ? `${poTag} ${cleanRemarks}` : poTag;

                    const updateData: any = {
                        from_our_company: companyMap[billFrom] || 'Packaging',
                        remarks: newRemarks,
                    };

                    if (item.rate) {
                        updateData.rate = item.rate;
                    }

                    if (shipToText) {
                        updateData.delivery_address = shipToText;
                    }

                    updates.push(
                        supabase
                            .from('orders')
                            .update(updateData)
                            .eq('id', orderId)
                    );
                }
            }

            await Promise.all(updates);
            setSuccessMessage(`Successfully tagged ${updates.length} orders under PO #${poNumber}!`);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1200);

        } catch (err: any) {
            console.error('Error saving tagged orders:', err);
            setError(err.message || 'Failed to save tagged orders.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-lg">
                            <UploadCloud className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold uppercase tracking-tight">Upload & Parse Purchase Order (PO)</h3>
                            <p className="text-xs text-slate-400">Extracts company, Bill To/Ship To, line items & tags orders</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    {/* Error / Success banners */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                    {successMessage && (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            <span>{successMessage}</span>
                        </div>
                    )}

                    {/* 1. File Upload Dropzone */}
                    {!file && (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <div className="w-12 h-12 rounded-full bg-indigo-100 group-hover:bg-indigo-200 flex items-center justify-center mb-3 transition-colors">
                                <UploadCloud className="w-6 h-6 text-indigo-600" />
                            </div>
                            <h4 className="text-sm font-bold text-slate-800">Select or Drag & Drop PO PDF File</h4>
                            <p className="text-xs text-slate-400 mt-1 max-w-sm">
                                Upload a BDR or client Purchase Order to automatically detect billing company, units & match products.
                            </p>
                        </div>
                    )}

                    {/* Parsing Spinner */}
                    {parsing && (
                        <div className="p-10 flex flex-col items-center justify-center gap-3 text-center">
                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                            <span className="text-sm font-bold text-slate-700">Reading & parsing Purchase Order...</span>
                            <span className="text-xs text-slate-400">Detecting Bill From company, Padra / Halol keywords, and line items</span>
                        </div>
                    )}

                    {/* 2. Parsed PO Summary Card */}
                    {file && !parsing && (
                        <div className="space-y-6">
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-indigo-600" />
                                        <span className="text-xs font-bold text-slate-800 truncate">{file.name}</span>
                                    </div>
                                    <button
                                        onClick={() => { setFile(null); setItems([]); }}
                                        className="text-xs text-indigo-600 hover:underline font-semibold"
                                    >
                                        Upload Different PO
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {/* PO Number */}
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 uppercase">PO Number</label>
                                        <input
                                            value={poNumber}
                                            onChange={e => setPoNumber(e.target.value)}
                                            className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                                            placeholder="PO Number"
                                        />
                                    </div>

                                    {/* PO Date */}
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 uppercase">PO Date</label>
                                        <input
                                            value={poDate}
                                            onChange={e => setPoDate(e.target.value)}
                                            className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900"
                                            placeholder="DD/MM/YYYY"
                                        />
                                    </div>

                                    {/* Bill From Company */}
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                            <Building className="w-3 h-3 text-indigo-600" /> Bill From Company
                                        </label>
                                        <select
                                            value={billFrom}
                                            onChange={e => setBillFrom(e.target.value as any)}
                                            className="w-full mt-1 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-bold text-indigo-900"
                                        >
                                            <option value="Creative Packaging">Creative Packaging</option>
                                            <option value="Creative Printers">Creative Printers</option>
                                            <option value="Creative Enterprise">Creative Enterprise</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Bill To & Ship To Keywords */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                                    <div className="p-3 bg-white border border-slate-200 rounded-lg">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                                <MapPin className="w-3 h-3 text-blue-600" /> Bill To Unit
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                billToUnit === 'Padra' ? 'bg-amber-100 text-amber-800' :
                                                billToUnit === 'Halol' ? 'bg-emerald-100 text-emerald-800' :
                                                'bg-slate-100 text-slate-600'
                                            }`}>
                                                {billToUnit}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-600 line-clamp-2">{billToText || 'Standard Bill To'}</p>
                                    </div>

                                    <div className="p-3 bg-white border border-slate-200 rounded-lg">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                                <MapPin className="w-3 h-3 text-emerald-600" /> Ship To Unit
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                shipToUnit === 'Padra' ? 'bg-amber-100 text-amber-800' :
                                                shipToUnit === 'Halol' ? 'bg-emerald-100 text-emerald-800' :
                                                'bg-blue-100 text-blue-800'
                                            }`}>
                                                {shipToUnit}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-600 line-clamp-2">{shipToText || 'Same as Bill To'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Items List to Tag */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                        <Tag className="w-4 h-4 text-indigo-600" />
                                        PO Line Items ({items.length}) — Tag to Orders
                                    </h4>
                                    <span className="text-[11px] text-slate-400">Match each PO item with your order</span>
                                </div>

                                {items.length === 0 ? (
                                    <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                        No items detected in table. Please check if PDF is standard vector format.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {items.map((item, idx) => {
                                            const currentTaggedId = taggedOrders[idx] || '';

                                            return (
                                                <div key={idx} className="p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors shadow-sm space-y-3">
                                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
                                                        <div className="space-y-0.5 min-w-0">
                                                            {item.materialCode && (
                                                                <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                                                                    Material Code: {item.materialCode}
                                                                </span>
                                                            )}
                                                            <div className="text-xs font-extrabold text-slate-900 leading-snug">
                                                                {item.exactPoName}
                                                            </div>
                                                            {item.hsn && (
                                                                <span className="text-[10px] text-slate-400">HSN: {item.hsn}</span>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-3 shrink-0 text-right">
                                                            {item.quantity && (
                                                                <div>
                                                                    <div className="text-[10px] text-slate-400 uppercase font-medium">PO Qty</div>
                                                                    <div className="text-xs font-bold text-slate-800">{item.quantity.toLocaleString()} {item.uom || 'NOS'}</div>
                                                                </div>
                                                            )}
                                                            {item.rate && (
                                                                <div>
                                                                    <div className="text-[10px] text-slate-400 uppercase font-medium">Rate</div>
                                                                    <div className="text-xs font-bold text-emerald-700">₹{item.rate}</div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Tagging Dropdown */}
                                                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                                                        <span className="text-[11px] font-bold text-slate-500 shrink-0 flex items-center gap-1">
                                                            <ChevronRight className="w-3.5 h-3.5 text-indigo-600" />
                                                            Tag to Order:
                                                        </span>
                                                        <select
                                                            value={currentTaggedId}
                                                            onChange={e => handleTagChange(idx, e.target.value)}
                                                            className={`flex-1 text-xs py-1.5 px-3 rounded-lg border font-semibold ${
                                                                currentTaggedId ? 'bg-indigo-50/50 border-indigo-200 text-indigo-950' : 'bg-slate-50 border-slate-300 text-slate-600'
                                                            }`}
                                                        >
                                                            <option value="">-- Select Order to Tag --</option>
                                                            {availableOrders.map(order => (
                                                                <option key={order.id} value={order.id}>
                                                                    {order.order_id || `#${order.id}`} — {order.product_name} (Qty: {order.quantity || 0})
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>

                    {file && !parsing && (
                        <button
                            type="button"
                            onClick={handleSaveTagging}
                            disabled={saving || items.length === 0}
                            className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Tagging Orders...</span>
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    <span>Confirm & Tag Orders</span>
                                </>
                            )}
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}
