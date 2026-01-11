'use client';

import { useEffect, useState, Suspense, useMemo, useCallback } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Loader2, ChevronLeft, Palette, MessageCircle, User, Printer, Camera } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import html2canvas from 'html2canvas';

function PunchingSummaryContent() {
    const searchParams = useSearchParams();
    const idsString = searchParams.get('ids');
    const [orders, setOrders] = useState<any[]>([]);
    const [printers, setPrinters] = useState<any[]>([]);
    const [selectedPrinter, setSelectedPrinter] = useState<any>(null);
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
                        product_name,
                        artwork_code,
                        specs
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
    const checkEffect = (order: any, term: string) => {
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
        if (!selectedPrinter) return orders;
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
        if (!selectedPrinter) return '';

        // Define column widths
        const w = { sr: 2, prod: 10, pqty: 6, past: 6, mqty: 6 };
        const pad = (s: string, n: number) => s.slice(0, n).padEnd(n);
        const border = `+${'-'.repeat(w.sr)}+${'-'.repeat(w.prod)}+${'-'.repeat(w.pqty)}+${'-'.repeat(w.past)}+${'-'.repeat(w.mqty)}+\n`;

        let message = `*PUNCHING SUMMARY*\n`;
        message += `*To:* ${selectedPrinter.name || 'Printer'}\n`;
        message += '```\n';
        message += border;
        message += `|${pad('Sr', w.sr)}|${pad('Product', w.prod)}|${pad('PQty', w.pqty)}|${pad('Past', w.past)}|${pad('MQty', w.mqty)}|\n`;
        message += border;

        filteredOrders.forEach((o, i) => {
            const product = (o.products?.product_name || o.product_name || 'N/A').toUpperCase();
            const pqty = (Number(o.total_print_qty) || 0).toLocaleString('en-IN').replace(/,/g, ''); // Compact
            const mqty = calculateMaxQty(o.quantity).toLocaleString('en-IN').replace(/,/g, ''); // Compact
            const past = (o.pasting_type || '-').slice(0, w.past);

            message += `|${pad(String(i + 1), w.sr)}|${pad(product, w.prod)}|${pad(pqty, w.pqty)}|${pad(past, w.past)}|${pad(mqty, w.mqty)}|\n`;
        });

        message += border;
        message += '```';
        return message;
    }, [selectedPrinter, filteredOrders]);

    const waUrl = useMemo(() => {
        if (!selectedPrinter || filteredOrders.length === 0) return "#";
        const message = generateMessage();
        let phone = String(selectedPrinter.phone || '').replace(/\D/g, '');
        if (!phone) return "#";
        if (phone.length === 10) phone = '91' + phone;
        return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
    }, [selectedPrinter, filteredOrders, generateMessage]);

    const sendWhatsAppImage = async () => {
        if (!selectedPrinter || waUrl === "#") return;
        setIsGenerating(true);
        try {
            const tableElement = document.getElementById('punching-summary-table');
            if (!tableElement) throw new Error('Table not found.');

            const canvas = await html2canvas(tableElement, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                ignoreElements: (el) => el.classList.contains('print:hidden')
            });

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
        } catch (error: any) {
            console.error('Sharing failed:', error);
            if (error.name !== 'AbortError') {
                alert('Error sharing image: ' + error.message);
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
                                value={selectedPrinter?.id?.toString() || ""}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const p = printers.find(pr => String(pr.id) === val);
                                    if (p) setSelectedPrinter(p);
                                }}
                            >
                                <option value="">Select Printer...</option>
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
                            disabled={isGenerating || waUrl === "#"}
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

            <div id="punching-summary-table" className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-2xl p-1">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-slate-900 text-white text-left">
                            <th className="px-4 py-4 border-r border-slate-700 text-[11px] font-black uppercase text-center w-12">Sr.</th>
                            <th className="px-6 py-4 border-r border-slate-700 text-[11px] font-black uppercase tracking-wider">Product & Artwork</th>
                            <th className="px-4 py-4 border-r border-slate-700 text-[11px] font-black uppercase text-center">Print Size</th>
                            <th className="px-4 py-4 border-r border-slate-700 text-[11px] font-black uppercase text-center tracking-tighter">Print Qtry</th>
                            <th className="px-4 py-4 border-r border-slate-700 text-[11px] font-black uppercase text-center">Emboss</th>
                            <th className="px-4 py-4 border-r border-slate-700 text-[11px] font-black uppercase text-center">Pasting</th>
                            <th className="px-6 py-4 text-[11px] font-black uppercase text-center bg-rose-950">Max Del. Qty</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredOrders.length > 0 ? filteredOrders.map((order, index) => (
                            <tr key={String(order.id)} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-5 border-r border-slate-50 text-xs font-bold text-slate-400 text-center">{index + 1}</td>
                                <td className="px-6 py-5 border-r border-slate-50">
                                    <div className="text-sm font-black text-slate-900 uppercase tracking-tight">{order.products?.product_name || order.product_name || 'N/A'}</div>
                                    <div className="text-[10px] text-rose-600 font-bold uppercase tracking-widest mt-1">{order.products?.artwork_code || order.artwork_code || '-'}</div>
                                </td>
                                <td className="px-4 py-5 border-r border-slate-50 text-sm font-bold text-slate-700 text-center">{order.print_size || '-'}</td>
                                <td className="px-4 py-5 border-r border-slate-50 text-sm font-black text-slate-900 text-center">{(Number(order.total_print_qty) || 0).toLocaleString()}</td>
                                <td className="px-4 py-5 border-r border-slate-50 text-center">
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded ${checkEffect(order, 'Embossing') === 'YES' ? 'bg-orange-100 text-orange-700' : 'text-slate-200'}`}>
                                        {checkEffect(order, 'Embossing')}
                                    </span>
                                </td>
                                <td className={`px-4 py-5 border-r border-slate-50 text-sm font-bold text-center ${String(order.pasting_type || '').toLowerCase().includes('lock bottom') ? 'bg-yellow-100 font-black' : 'text-slate-600'}`}>
                                    {order.pasting_type || '-'}
                                </td>
                                <td className="px-6 py-5 text-base font-black text-rose-700 text-center bg-rose-50/30">
                                    {calculateMaxQty(order.quantity).toLocaleString()}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={7} className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest italic bg-slate-50/50">
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
