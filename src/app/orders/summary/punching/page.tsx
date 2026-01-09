'use client';

import { useEffect, useState, Suspense, useMemo } from 'react';
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
    const [isSendingText, setIsSendingText] = useState(false);

    useEffect(() => {
        fetchOrders();
        fetchPrinters();
    }, [idsString]);

    // Auto-select the first printer that has jobs in the list
    useEffect(() => {
        if (orders.length > 0 && printers.length > 0 && !selectedPrinter) {
            const firstJob = orders[0];
            const p = printers.find(pr =>
                (firstJob.printer_id && pr.id === firstJob.printer_id) ||
                (firstJob.printer_name && pr.name === firstJob.printer_name)
            );
            if (p) setSelectedPrinter(p);
        }
    }, [orders, printers, selectedPrinter]);

    async function fetchOrders() {
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
    }

    async function fetchPrinters() {
        const { data } = await supabase.from('printers').select('*').order('name');
        if (data) setPrinters(data);
    }

    // Only show printers that have orders in the current selected set
    const activePrinters = useMemo(() => {
        if (orders.length === 0) return [];
        const activeIds = new Set(orders.map(o => o.printer_id).filter(Boolean));
        const activeNames = new Set(orders.map(o => o.printer_name).filter(Boolean));
        return printers.filter(p => activeIds.has(p.id) || activeNames.has(p.name));
    }, [orders, printers]);

    const filteredOrders = useMemo(() => {
        if (!selectedPrinter) return orders;
        return orders.filter(o =>
            (o.printer_id === selectedPrinter.id) ||
            (o.printer_name === selectedPrinter.name)
        );
    }, [orders, selectedPrinter]);

    // Formula for Max Delivery Quantity
    const calculateMaxQty = (qty: number) => {
        if (!qty) return 0;
        if (qty <= 5000) return Math.ceil(qty * 1.20);
        if (qty <= 10000) return Math.ceil(qty * 1.17);
        return Math.ceil(qty * 1.15);
    };

    // Helper to check for specific special effects
    const checkEffect = (order: any, term: string) => {
        const specs = (order.specs || order.products?.specs || '').toLowerCase();
        const effects = (order.special_effects || '').toLowerCase();
        if (specs.includes(term.toLowerCase()) || effects.includes(term.toLowerCase())) {
            return 'YES';
        }
        return '-';
    };


    const sendWhatsAppImage = async () => {
        if (!selectedPrinter) {
            alert('Please select a printer to send the summary.');
            return;
        }

        setIsGenerating(true);
        // Small delay to allow 'Generating...' UI state to render (Fixes INP issue)
        await new Promise(r => setTimeout(r, 100));

        try {
            const tableElement = document.getElementById('punching-summary-table');
            if (!tableElement) throw new Error('Table not found.');

            const canvas = await html2canvas(tableElement, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false
            });

            // Trigger the clipboard copy
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            if (!blob) throw new Error('Failed to generate image.');

            let phone = (selectedPrinter.phone || '').replace(/\D/g, '');
            if (!phone) {
                alert('This printer does not have a valid phone number.');
                setIsGenerating(false);
                return;
            }
            if (phone.length === 10) phone = '91' + phone;

            const text = `*PUNCHING SUMMARY FOR ${selectedPrinter.name}*\n\nI am sending the table image now. Please check above/below.`;
            const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

            // Create Clipboard Item and copy
            if (typeof ClipboardItem !== 'undefined') {
                try {
                    const item = new ClipboardItem({ "image/png": blob });
                    await navigator.clipboard.write([item]);
                    alert('✅ Table image COPIED to clipboard!\n\nWhatsApp will open now. Just PASTE (Ctrl+V) the image in the chat to send it.');
                } catch (clipboardErr) {
                    console.error('Clipboard write failed:', clipboardErr);
                    alert('Image was generated but could not be copied automatically. I will open WhatsApp for you to send the text instead.');
                }
            } else {
                alert('Your browser does not support automatic copying. I will open WhatsApp with the text summary.');
            }

            window.open(waUrl, '_blank');
        } catch (error) {
            console.error('WhatsApp Image Error:', error);
            alert('Technical error generating image. Opening text version...');
            sendWhatsAppText();
        } finally {
            setIsGenerating(false);
        }
    };

    const sendWhatsAppText = () => {
        if (!selectedPrinter) {
            alert('Please select a printer to send the summary.');
            return;
        }

        if (filteredOrders.length === 0) {
            alert('No orders found for the selected printer.');
            return;
        }

        setIsSendingText(true);

        setTimeout(() => {
            let message = `*PUNCHING SUMMARY*\n`;
            message += `*To:* ${selectedPrinter.name}\n`;
            message += `--------------------------\n\n`;

            filteredOrders.forEach((o, i) => {
                const product = o.products?.product_name || o.product_name;
                const code = o.products?.artwork_code || o.artwork_code || '-';
                const maxQty = calculateMaxQty(o.quantity);
                message += `${i + 1}. *${product}* (${code})\n`;
                message += `   Size: ${o.print_size || '-'}\n`;
                message += `   Print Qty: ${(o.total_print_qty || 0).toLocaleString()}\n`;
                message += `   Emboss: ${checkEffect(o, 'Embossing')}\n`;
                message += `   Pasting: ${o.pasting_type || '-'}\n`;
                message += `   *Max Del Qty: ${maxQty.toLocaleString()}*\n\n`;
            });

            let phone = (selectedPrinter.phone || '').replace(/\D/g, '');
            if (phone) {
                if (phone.length === 10) phone = '91' + phone;
                const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
                window.open(url, '_blank');
            } else {
                alert('Valid phone number not found.');
            }
            setIsSendingText(false);
        }, 100);
    };

    const handlePrint = () => {
        // Yield to browser before printing (Fixes INP issue)
        setTimeout(() => {
            window.print();
        }, 100);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-rose-600" />
            <p className="text-slate-500 font-medium tracking-wide">Generating Punching Summary...</p>
        </div>
    );

    return (
        <div className="p-4 md:p-8 max-w-[1400px] mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4 print:hidden">
                <div className="flex items-center gap-4">
                    <Link href="/orders" className="p-2 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 shadow-sm">
                        <ChevronLeft className="w-6 h-6 text-slate-600" />
                    </Link>
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 font-montserrat">
                        <Palette className="w-8 h-8 text-rose-600 bg-rose-50 p-1.5 rounded-lg" />
                        Punching Summary
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-3 bg-white p-2 border border-slate-200 rounded-xl shadow-sm">
                    <div className="flex items-center gap-2 px-3 border-r border-slate-200">
                        <User className="w-4 h-4 text-slate-400" />
                        <select
                            className="text-sm font-normal text-slate-700 outline-none bg-transparent min-w-[150px] font-montserrat"
                            onChange={(e) => {
                                const p = printers.find(p => p.id === parseInt(e.target.value));
                                setSelectedPrinter(p);
                            }}
                            defaultValue=""
                        >
                            <option value="">{activePrinters.length === 0 ? 'Searching Printers...' : 'All Selected Printers'}</option>
                            {activePrinters.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.phone || 'No Phone'})</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={sendWhatsAppImage}
                        disabled={isGenerating || !selectedPrinter}
                        className={`px-4 py-2 rounded-lg font-normal text-sm transition-all shadow-md flex items-center gap-2 active:scale-95 font-montserrat ${isGenerating ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                        {isGenerating ? 'Generating...' : 'Send Table Image'}
                    </button>

                    <button
                        onClick={sendWhatsAppText}
                        disabled={isSendingText || !selectedPrinter}
                        className={`px-4 py-2 rounded-lg font-normal text-sm transition-all shadow-md flex items-center gap-2 active:scale-95 font-montserrat ${isSendingText ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-700 text-white hover:bg-slate-800'}`}
                    >
                        {isSendingText ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                        {isSendingText ? 'Sending...' : 'Send Text'}
                    </button>

                    <button
                        onClick={handlePrint}
                        className="bg-rose-600 text-white px-4 py-2 rounded-lg font-normal text-sm hover:bg-rose-700 transition-all shadow-md flex items-center gap-2 active:scale-95 font-montserrat"
                    >
                        <Printer className="w-4 h-4" />
                        Print Summary
                    </button>
                </div>
            </div>

            <div id="punching-summary-table" className="overflow-x-auto bg-white rounded-2xl border-2 border-slate-200 shadow-xl overflow-hidden font-montserrat p-1">
                <table className="w-full border-collapse text-left">
                    <thead>
                        <tr className="bg-slate-900 text-white">
                            <th className="px-4 py-4 border-r border-slate-700 text-[12px] font-semibold uppercase tracking-wider w-[55px] text-center">Sr. No.</th>
                            <th className="px-6 py-4 border-r border-slate-700 text-[12px] font-semibold uppercase tracking-wider min-w-[250px]">Product & Artwork</th>
                            <th className="px-4 py-4 border-r border-slate-700 text-[12px] font-semibold uppercase tracking-wider text-center">Print Size</th>
                            <th className="px-4 py-4 border-r border-slate-700 text-[12px] font-semibold uppercase tracking-wider text-center">Print Qty</th>
                            <th className="px-4 py-4 border-r border-slate-700 text-[12px] font-semibold uppercase tracking-wider text-center">Embossing</th>
                            <th className="px-4 py-4 border-r border-slate-700 text-[12px] font-semibold uppercase tracking-wider text-center">Pasting</th>
                            <th className="px-6 py-4 text-[12px] font-semibold uppercase tracking-wider text-center bg-rose-950/20">Max Del. Qty</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {filteredOrders.map((order, index) => (
                            <tr key={order.id} className="hover:bg-slate-50/80 transition-colors group">
                                <td className="px-4 py-4 border-r border-slate-100 text-sm font-normal text-slate-400 text-center">{index + 1}</td>
                                <td className="px-6 py-4 border-r border-slate-100">
                                    <div className="text-base font-semibold text-slate-800 group-hover:text-rose-600 transition-colors uppercase tracking-tight">{order.products?.product_name || order.product_name}</div>
                                    <div className="text-[12px] text-slate-500 font-normal uppercase tracking-widest mt-0.5">{order.products?.artwork_code || order.artwork_code || '-'}</div>
                                </td>
                                <td className="px-4 py-4 border-r border-slate-100 text-[15px] font-normal text-slate-700 text-center">{order.print_size || '-'}</td>
                                <td className="px-4 py-4 border-r border-slate-100 text-base font-normal text-slate-900 text-center">{(order.total_print_qty || 0).toLocaleString()}</td>
                                <td className="px-4 py-4 border-r border-slate-100 text-sm font-normal text-center">
                                    <span className={`px-3 py-1 rounded-full ${checkEffect(order, 'Embossing') === 'YES' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'text-slate-300'}`}>
                                        {checkEffect(order, 'Embossing')}
                                    </span>
                                </td>
                                <td className={`px-4 py-4 border-r border-slate-100 text-base font-normal text-slate-700 text-center transition-colors ${order.pasting_type?.toLowerCase().includes('lock bottom') ? 'bg-yellow-200 font-semibold' : ''}`}>
                                    {order.pasting_type || '-'}
                                </td>
                                <td className="px-6 py-4 text-lg font-normal text-rose-600 text-center bg-rose-50/30">
                                    {calculateMaxQty(order.quantity).toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {orders.length === 0 && (
                <div className="text-center py-24 bg-white rounded-3xl border-4 border-dashed border-slate-100 mt-8 shadow-inner">
                    <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Palette className="w-10 h-10 text-slate-200" />
                    </div>
                    <p className="text-slate-400 font-black text-lg uppercase tracking-tight">No active punching jobs</p>
                    <p className="text-slate-300 text-sm mt-1 font-medium italic">Requirement list is currently empty.</p>
                </div>
            )}

            <style jsx global>{`
                @media print {
                    @page { margin: 1cm; size: landscape; }
                    body { background: white; -webkit-print-color-adjust: exact; }
                    .print\\:hidden { display: none !important; }
                    table { border-collapse: collapse !important; border: 2px solid #000 !important; width: 100% !important; }
                    th, td { border: 1px solid #000 !important; padding: 8px !important; }
                    th { background-color: #000 !important; color: #fff !important; }
                    .bg-rose-50\\/30 { background-color: transparent !important; }
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
                <p className="text-slate-500 font-medium tracking-wide font-black uppercase tracking-widest">Gathering Data...</p>
            </div>
        }>
            <PunchingSummaryContent />
        </Suspense>
    );
}
