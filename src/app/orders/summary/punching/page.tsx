'use client';

import { useEffect, useState, Suspense, useMemo, useCallback } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Loader2, ChevronLeft, Palette, MessageCircle, Printer, Camera } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import html2canvas from 'html2canvas';
import { Order, Product } from '@/types';

type PrinterType = {
    id: number;
    name: string;
    phone?: string;
};

function PunchingSummaryContent() {
    const searchParams = useSearchParams();
    const idsString = searchParams.get('ids');
    const [orders, setOrders] = useState<(Order & { products: Partial<Product> })[]>([]);
    const [printers, setPrinters] = useState<PrinterType[]>([]);
    const [selectedPrinter, setSelectedPrinter] = useState<PrinterType | null>(null);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('orders')
                .select(`
                    *,
                    products (
                        id,
                        product_name,
                        artwork_code,
                        specs,
                        special_effects,
                        dimension,
                        specifications!fk_specification (name),
                        pasting!fk_pasting (name),
                        sizes!fk_size (name)
                    )
                `);

            if (idsString) {
                const ids = idsString.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
                if (ids.length > 0) {
                    query = query.in('id', ids);
                }
            } else {
                query = query.neq('status', 'Complete');
            }

            const { data, error } = await query.order('id', { ascending: false });
            if (error) throw error;
            setOrders(data || []);
        } catch (err) {
            console.error('Error fetching punching summary:', err);
        } finally {
            setLoading(false);
        }
    }, [idsString]);

    const fetchPrinters = useCallback(async () => {
        try {
            const { data } = await supabase.from('printers').select('*').order('name');
            if (data) setPrinters(data);
        } catch (err) {
            console.error('Error fetching printers:', err);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
        fetchPrinters();
    }, [fetchOrders, fetchPrinters]);

    // Formula for Max Delivery Quantity
    const calculateMaxQty = (qty: number) => {
        const n = Number(qty) || 0;
        if (n <= 5000) return Math.ceil(n * 1.20);
        if (n <= 10000) return Math.ceil(n * 1.17);
        return Math.ceil(n * 1.15);
    };

    // Helper to check for specific special effects
    const checkEffect = (order: Order & { products?: Partial<Product> | null }, term: string) => {
        const specs = String(order?.specs || order?.products?.specs || '').toLowerCase();
        const effects = String(order?.special_effects || '').toLowerCase();
        const t = term.toLowerCase();
        return (specs.includes(t) || effects.includes(t)) ? 'YES' : '-';
    };

    // Only show printers that have orders in the current selected set
    const activePrinters = useMemo(() => {
        if (orders.length === 0) return [];
        const activeIds = new Set(orders.map(o => o.printer_id).filter(Boolean).map(String));
        const activeNames = new Set(orders.map(o => o.printer_name).filter(Boolean).map(String));
        return printers.filter(p => activeIds.has(String(p.id)) || activeNames.has(String(p.name)));
    }, [orders, printers]);

    const filteredOrders = useMemo(() => {
        if (!selectedPrinter || selectedPrinter.id === 0) return orders;
        return orders.filter(o =>
            String(o.printer_id) === String(selectedPrinter.id) ||
            String(o.printer_name) === String(selectedPrinter.name)
        );
    }, [orders, selectedPrinter]);

    // Auto-select the first printer
    useEffect(() => {
        if (activePrinters.length > 0 && !selectedPrinter) {
            setSelectedPrinter(activePrinters[0]);
        }
    }, [activePrinters, selectedPrinter]);

    const generateMessage = useCallback(() => {
        const printerName = selectedPrinter && selectedPrinter.id !== 0 ? selectedPrinter.name : 'ALL SELECTED';

        // Define column widths
        const w = { sr: 2, prod: 10, pqty: 6, past: 6, mqty: 6 };
        const pad = (s: string, n: number) => s.slice(0, n).padEnd(n);
        const border = `+${'-'.repeat(w.sr)}+${'-'.repeat(w.prod)}+${'-'.repeat(w.pqty)}+${'-'.repeat(w.past)}+${'-'.repeat(w.mqty)}+\n`;

        let message = `*PUNCHING SUMMARY*\n`;
        message += `*To:* ${printerName}\n`;
        message += '```\n';
        message += border;
        message += `|${pad('Sr', w.sr)}|${pad('Product', w.prod)}|${pad('PQty', w.pqty)}|${pad('Past', w.past)}|${pad('MQty', w.mqty)}|\n`;
        message += border;

        filteredOrders.forEach((o, i) => {
            const product = (o.products?.product_name || o.product_name || 'N/A').toUpperCase();
            const pqty = (Number(o.total_print_qty) || 0).toLocaleString('en-IN').replace(/,/g, ''); // Compact
            const mqty = calculateMaxQty(o.quantity || 0).toLocaleString('en-IN').replace(/,/g, ''); // Compact
            const past = (o.pasting_type || '-').slice(0, w.past);

            const printerSuffix = (!selectedPrinter || selectedPrinter.id === 0) ? ` [${o.printer_name || '?'}]` : '';
            message += `|${pad(String(i + 1), w.sr)}|${pad(product + printerSuffix, w.prod)}|${pad(pqty, w.pqty)}|${pad(past, w.past)}|${pad(mqty, w.mqty)}|\n`;
        });

        message += border;
        message += '```';
        return message;
    }, [selectedPrinter, filteredOrders]);

    const waUrl = useMemo(() => {
        if (filteredOrders.length === 0) return "#";
        const message = generateMessage();
        const printer = selectedPrinter || { id: 0, phone: '' };
        let phone = String(printer.phone || '').replace(/\D/g, '');

        if (phone) {
            if (phone.length === 10) phone = '91' + phone;
            return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
        }

        // No phone number (Manual Selection mode)
        return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    }, [selectedPrinter, filteredOrders, generateMessage]);

    const sendWhatsAppImage = async () => {
        if (filteredOrders.length === 0) return;
        setIsGenerating(true);
        try {
            const tableElement = document.getElementById('punching-summary-table');
            if (!tableElement) throw new Error('Table not found.');

            // Clone the table to ensure full width capture on mobile
            const clone = tableElement.cloneNode(true) as HTMLElement;
            clone.style.position = 'absolute';
            clone.style.left = '-9999px';
            clone.style.top = '0';
            clone.style.width = '650px'; // Compact width for mobile
            clone.style.overflow = 'visible';
            clone.style.height = 'auto';
            document.body.appendChild(clone);

            const canvas = await html2canvas(clone, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                ignoreElements: (el) => el.classList.contains('print:hidden')
            });

            document.body.removeChild(clone);

            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            if (!blob) throw new Error('Failed to create image.');

            // 1. Try Native Sharing (Mobile - iOS/Android)
            const file = new File([blob], `Punching_Summary_${new Date().getTime()}.png`, { type: 'image/png' });
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Punching Summary',
                    text: 'Here is the Punching Summary table.'
                });
            }
            // 2. Fallback to Clipboard (Desktop/Web)
            else if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
                const item = new ClipboardItem({ "image/png": blob });
                await navigator.clipboard.write([item]);
                alert('Table image COPIED to clipboard! Now PASTE it in the WhatsApp chat.');
                window.open(waUrl, '_blank');
            } else {
                alert('Sharing not fully supported on this device. Opening WhatsApp text...');
                window.open(waUrl, '_blank');
            }
        } catch (error: unknown) {
            const err = error as Error;
            console.error('Sharing failed:', err);
            if (err.name !== 'AbortError') {
                alert('Error sharing image: ' + err.message);
                window.open(waUrl, '_blank');
            }
        } finally {
            setIsGenerating(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-rose-600" />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Gathering Orders...</p>
        </div>
    );

    return (
        <div className="p-4 md:p-8 max-w-[1400px] mx-auto font-montserrat">
            <div className="flex flex-wrap items-center justify-between mb-8 gap-6 print:hidden">
                <div className="flex items-center gap-4">
                    <Link href="/orders" className="p-2 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200">
                        <ChevronLeft className="w-6 h-6 text-slate-600" />
                    </Link>
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                        <Palette className="w-8 h-8 text-rose-600 bg-rose-50 p-1.5 rounded-lg" />
                        Punching Summary
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-4 bg-white p-3 border border-slate-200 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-4 px-3 border-r border-slate-200">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Selected Printer</span>
                            <select
                                className="text-sm font-black text-emerald-600 outline-none bg-transparent min-w-[200px] cursor-pointer"
                                value={selectedPrinter?.id?.toString() || "0"}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === "0") {
                                        setSelectedPrinter({ id: 0, name: 'All Selected', phone: '' });
                                        return;
                                    }
                                    const p = printers.find(pr => String(pr.id) === val);
                                    if (p) setSelectedPrinter(p);
                                }}
                            >
                                <option value="0">ALL SELECTED ORDERS</option>
                                {activePrinters.map(p => (
                                    <option key={String(p.id)} value={String(p.id)}>{String(p.name || 'Unknown').toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col border-l pl-4 border-slate-100">
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">WhatsApp Number</span>
                            <span className="text-sm font-bold text-slate-700 font-mono italic">
                                {selectedPrinter?.phone || 'Not Available'}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={sendWhatsAppImage}
                            disabled={isGenerating || filteredOrders.length === 0}
                            className="bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-bold text-sm hover:bg-emerald-700 transition-all shadow-md flex items-center gap-2 active:scale-95 disabled:opacity-50"
                        >
                            <Camera className="w-4 h-4" />
                            {isGenerating ? 'Please wait...' : 'SEND IMAGE'}
                        </button>

                        <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                                if (waUrl === "#") {
                                    e.preventDefault();
                                    alert("Please select a printer with a phone number.");
                                }
                            }}
                            className={`px-6 py-2.5 rounded-lg font-black text-sm transition-all shadow-lg flex items-center gap-2 active:scale-95 ${waUrl === "#" ? 'bg-slate-100 text-slate-400 pointer-events-none' : 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-100'}`}
                        >
                            <MessageCircle className="w-4 h-4" />
                            SEND WHATSAPP
                        </a>

                        <button
                            onClick={() => window.print()}
                            className="bg-slate-700 text-white px-4 py-2.5 rounded-lg font-bold text-sm hover:bg-slate-800 transition-all shadow-md flex items-center gap-2 active:scale-95"
                        >
                            <Printer className="w-4 h-4" />
                            PRINT
                        </button>
                    </div>
                </div>
            </div>

            <div id="punching-summary-table" style={{ backgroundColor: '#ffffff', borderRadius: '1rem', border: '1px solid #e2e8f0', padding: '4px' }} className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }} className="text-left">
                            <th style={{ borderRight: '1px solid #334155', padding: '8px 4px' }} className="text-[10px] font-normal text-center w-8">Sr.</th>
                            <th style={{ borderRight: '1px solid #334155', padding: '8px 8px' }} className="text-[10px] font-normal">Product</th>
                            <th style={{ borderRight: '1px solid #334155', padding: '8px 4px' }} className="text-[10px] font-normal text-center">Size</th>
                            <th style={{ borderRight: '1px solid #334155', padding: '8px 4px' }} className="text-[10px] font-normal text-center">Qty</th>
                            <th style={{ borderRight: '1px solid #334155', padding: '8px 4px' }} className="text-[10px] font-normal text-center">Emboss</th>
                            <th style={{ borderRight: '1px solid #334155', padding: '8px 4px' }} className="text-[10px] font-normal text-center">Past.</th>
                            <th style={{ backgroundColor: '#4c0519', padding: '8px 4px' }} className="text-[10px] font-normal text-center">Max Del.</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.length > 0 ? filteredOrders.map((order, index) => (
                            <tr key={String(order.id)} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ borderRight: '1px solid #f8fafc', color: '#64748b', padding: '8px 4px' }} className="text-[10px] text-center">{index + 1}</td>
                                <td style={{ borderRight: '1px solid #f8fafc', padding: '8px 8px' }} className="text-sm">
                                    <div style={{ color: '#0f172a', fontWeight: 700 }} className="leading-tight">{order.products?.product_name || order.product_name || 'N/A'}</div>
                                    {(!selectedPrinter || selectedPrinter.id === 0) && (
                                        <div style={{ color: '#4f46e5', fontSize: '9px', fontWeight: 700, backgroundColor: '#eef2ff', borderColor: '#e0e7ff', borderWidth: '1px', borderStyle: 'solid' }} className="uppercase px-1 rounded-sm mt-1 w-fit">
                                            {order.printer_name || 'NO PRINTER'}
                                        </div>
                                    )}
                                </td>
                                <td style={{ borderRight: '1px solid #f8fafc', color: '#334155', padding: '8px 4px' }} className="text-[11px] text-center">{order.products?.sizes?.name || order.products?.dimension || order.print_size || '-'}</td>
                                <td style={{ borderRight: '1px solid #f8fafc', color: '#0f172a', padding: '8px 4px' }} className="text-[11px] font-bold text-center">{(Number(order.total_print_qty) || 0).toLocaleString()}</td>
                                <td style={{ borderRight: '1px solid #f8fafc', padding: '8px 4px' }} className="text-center">
                                    <span
                                        style={checkEffect(order, 'Embossing') === 'YES' ? { backgroundColor: '#ffedd5', color: '#c2410c' } : { color: '#cbd5e1' }}
                                        className="text-[9px] px-1.5 py-0.5 rounded"
                                    >
                                        {checkEffect(order, 'Embossing') === 'YES' ? 'Y' : '-'}
                                    </span>
                                </td>
                                <td
                                    style={String(order.products?.pasting?.name || order.pasting_type || '').toLowerCase().includes('lock bottom') ? { backgroundColor: '#fef9c3', borderRight: '1px solid #f1f5f9', padding: '8px 4px' } : { color: '#475569', borderRight: '1px solid #f1f5f9', padding: '8px 4px' }}
                                    className="text-[10px] text-center"
                                >
                                    {(order.products?.pasting?.name || order.pasting_type) === 'Lock Bottom Pasting' ? 'Lock Bot' : (order.products?.pasting?.name || order.pasting_type || '-')}
                                </td>
                                <td style={{ backgroundColor: 'rgba(255, 241, 242, 0.4)', color: '#be123c', padding: '8px 8px', fontWeight: 700 }} className="text-xs text-center">
                                    {calculateMaxQty(order.quantity || 0).toLocaleString()}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={7} style={{ padding: '80px 0', backgroundColor: '#f8fafc', color: '#94a3b8' }} className="text-center font-bold uppercase tracking-widest italic">
                                    No active orders found for this printer.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <style jsx global>{`
                @media print {
                    @page { margin: 0.5cm; size: landscape; }
                    .print\\:hidden { display: none !important; }
                    #punching-summary-table { box-shadow: none !important; border: 1.5px solid #000 !important; }
                    table { border-collapse: collapse !important; width: 100% !important; }
                    th, td { border: 1px solid #000 !important; padding: 10px !important; color: black !important; }
                    th { background-color: #000 !important; color: white !important; -webkit-print-color-adjust: exact; }
                }
            `}</style>
        </div>
    );
}

export default function PunchingSummaryPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-rose-600" />
                <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Initializing...</p>
            </div>
        }>
            <PunchingSummaryContent />
        </Suspense>
    );
}
