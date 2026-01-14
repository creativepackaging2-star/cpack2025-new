'use client';

import { useEffect, useState, Suspense, useMemo, useCallback } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Loader2, ChevronLeft, Printer as PrinterIcon, MessageCircle, Camera } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import html2canvas from 'html2canvas';

type PrinterType = {
    id: number | string;
    name: string;
    phone?: string;
};

function PrinterSummaryContent() {
    const searchParams = useSearchParams();
    const idsString = searchParams.get('ids');
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPrinter, setSelectedPrinter] = useState<PrinterType | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        fetchOrders();
    }, [idsString]);

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
                        actual_gsm_used
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

            const { data, error } = await query.order('delivery_date', { ascending: true });

            if (error) throw error;
            setOrders(data || []);
        } catch (err) {
            console.error('Error fetching summary:', err);
        } finally {
            setLoading(false);
        }
    }

    // Derive active printers from the orders list
    const activePrinters = useMemo(() => {
        if (orders.length === 0) return [];
        const uniquePrinters = new Map<string, PrinterType>();

        orders.forEach(o => {
            if (o.printer_id || o.printer_name) {
                const id = o.printer_id || o.printer_name; // Fallback to name if ID missing
                if (!uniquePrinters.has(String(id))) {
                    uniquePrinters.set(String(id), {
                        id: o.printer_id || o.printer_name,
                        name: o.printer_name || 'Unknown',
                        phone: o.printer_mobile
                    });
                }
            }
        });
        return Array.from(uniquePrinters.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [orders]);

    // Filter orders based on selected printer
    const filteredOrders = useMemo(() => {
        if (!selectedPrinter) return orders;
        return orders.filter(o =>
            String(o.printer_id) === String(selectedPrinter.id) ||
            o.printer_name === selectedPrinter.name
        );
    }, [orders, selectedPrinter]);

    // Auto-select first printer if none selected
    useEffect(() => {
        if (activePrinters.length > 0 && !selectedPrinter) {
            setSelectedPrinter(activePrinters[0]);
        }
    }, [activePrinters, selectedPrinter]);

    const generateMessage = useCallback(() => {
        if (!selectedPrinter) return '';

        let message = `*PRINTER SUMMARY*\n`;
        message += `*To:* ${selectedPrinter.name}\n`;
        message += `--------------------------------\n`;

        filteredOrders.forEach((o, i) => {
            message += `${i + 1}. *${o.products?.product_name || o.product_name}*\n`;
            message += `   Size: ${o.print_size || '-'} | Qty: *${(o.total_print_qty || 0).toLocaleString()}*\n`;
            message += `   Paper: ${o.paper_type_name || '-'} (${o.gsm_value || '-'} GSM)\n`;
            message += `   Plate: ${o.plate_no || '-'} | Ink: ${o.ink || '-'}\n`;
            message += `--------------------------------\n`;
        });

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
            const tableElement = document.getElementById('printer-summary-table');
            if (!tableElement) throw new Error('Table not found.');

            // Clone for capture
            const clone = tableElement.cloneNode(true) as HTMLElement;
            clone.style.position = 'absolute';
            clone.style.left = '-9999px';
            clone.style.top = '0';
            clone.style.width = '800px'; // Wide enough for printer columns
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

            // Try native sharing then fallback to clipboard
            const file = new File([blob], `Printer_Summary_${new Date().getTime()}.png`, { type: 'image/png' });
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Printer Summary',
                    text: 'Here is the Printer Summary table.'
                });
            } else if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
                const item = new ClipboardItem({ "image/png": blob });
                await navigator.clipboard.write([item]);
                alert('Table image COPIED to clipboard! Now PASTE it in the WhatsApp chat.');
                window.open(waUrl, '_blank');
            } else {
                alert('Sharing not fully supported. Opening WhatsApp text...');
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
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            <p className="text-slate-500 font-medium">Generating Printer Summary...</p>
        </div>
    );

    return (
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto font-montserrat">
            <div className="flex flex-wrap items-center justify-between mb-8 gap-6 print:hidden">
                <div className="flex items-center gap-4">
                    <Link href="/orders" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <ChevronLeft className="w-6 h-6 text-slate-600" />
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <PrinterIcon className="w-8 h-8 text-indigo-600 bg-indigo-50 p-1.5 rounded-lg" />
                        Printer Summary
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-4 bg-white p-3 border border-slate-200 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-4 px-3 border-r border-slate-200">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Selected Printer</span>
                            <select
                                className="text-sm font-black text-indigo-600 outline-none bg-transparent min-w-[200px] cursor-pointer"
                                value={selectedPrinter?.id.toString() || ""}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const p = activePrinters.find(pr => String(pr.id) === val);
                                    if (p) setSelectedPrinter(p);
                                }}
                            >
                                <option value="">Select Printer...</option>
                                {activePrinters.map(p => (
                                    <option key={String(p.id)} value={String(p.id)}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col border-l pl-4 border-slate-100">
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">WhatsApp</span>
                            <span className="text-sm font-bold text-slate-700 font-mono italic">
                                {selectedPrinter?.phone || 'N/A'}
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
                            {isGenerating ? 'Wait...' : 'IMAGE'}
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
                            className={`px-6 py-2.5 rounded-lg font-black text-sm transition-all shadow-lg flex items-center gap-2 active:scale-95 ${waUrl === "#" ? 'bg-slate-100 text-slate-400 pointer-events-none' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'}`}
                        >
                            <MessageCircle className="w-4 h-4" />
                            WHATSAPP
                        </a>

                        <button
                            onClick={() => window.print()}
                            className="bg-slate-700 text-white px-4 py-2.5 rounded-lg font-bold text-sm hover:bg-slate-800 transition-all shadow-md flex items-center gap-2 active:scale-95"
                        >
                            <PrinterIcon className="w-4 h-4" />
                            PRINT
                        </button>
                    </div>
                </div>
            </div>

            <div id="printer-summary-table" className="overflow-x-auto bg-white rounded-xl border border-slate-300 shadow-sm p-1">
                <table className="w-full border-collapse text-left">
                    <thead>
                        <tr className="bg-slate-100 border-b border-slate-300">
                            <th className="px-3 py-3 border-r border-slate-300 text-[11px] font-semibold uppercase text-slate-700 w-[50px] text-center">Sr.</th>
                            <th className="px-3 py-3 border-r border-slate-300 text-[11px] font-semibold uppercase text-slate-700 min-w-[200px]">Product</th>
                            <th className="px-3 py-3 border-r border-slate-300 text-[11px] font-semibold uppercase text-slate-700 text-center">GSM</th>
                            <th className="px-3 py-3 border-r border-slate-300 text-[11px] font-semibold uppercase text-slate-700">Paper Type</th>
                            <th className="px-3 py-3 border-r border-slate-300 text-[11px] font-semibold uppercase text-slate-700 text-center">Size</th>
                            <th className="px-3 py-3 border-r border-slate-300 text-[11px] font-semibold uppercase text-slate-700 text-center">Print Qty</th>
                            <th className="px-3 py-3 border-r border-slate-300 text-[11px] font-semibold uppercase text-slate-700">Ink</th>
                            <th className="px-3 py-3 border-r border-slate-300 text-[11px] font-semibold uppercase text-slate-700 text-center">Plate</th>
                            <th className="px-3 py-3 border-r border-slate-300 text-[11px] font-semibold uppercase text-slate-700 text-center">Paper Ord</th>
                            <th className="px-3 py-3 border-r border-slate-300 text-[11px] font-semibold uppercase text-slate-700 text-center">Paper Qty</th>
                            <th className="px-3 py-3 text-[11px] font-semibold uppercase text-slate-700 text-center">UPS</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                        {filteredOrders.length > 0 ? filteredOrders.map((order, index) => (
                            <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-2 py-2 border-r border-slate-300 text-xs font-normal text-slate-500 text-center">{index + 1}</td>
                                <td className="px-3 py-2 border-r border-slate-300">
                                    <div className="text-sm font-bold text-slate-900 uppercase tracking-tight leading-snug">{order.products?.product_name || order.product_name}</div>
                                    <div className="text-[10px] text-slate-400 font-normal uppercase mt-0.5">{order.products?.artwork_code || order.artwork_code || '-'}</div>
                                </td>
                                <td className="px-2 py-2 border-r border-slate-300 text-xs font-normal text-slate-700 text-center">{order.gsm_value || order.products?.actual_gsm_used || '-'}</td>
                                <td className="px-3 py-2 border-r border-slate-300 text-xs font-normal text-slate-700">{order.paper_type_name || '-'}</td>
                                <td className="px-3 py-2 border-r border-slate-300 text-xs font-bold text-slate-800 text-center">{order.print_size || '-'}</td>
                                <td className="px-3 py-2 border-r border-slate-300 text-xs font-black text-emerald-700 text-center">{(order.total_print_qty || 0).toLocaleString()}</td>
                                <td className="px-3 py-2 border-r border-slate-300 text-[11px] font-normal text-slate-600 line-clamp-2 max-w-[150px]">{order.ink || '-'}</td>
                                <td className="px-3 py-2 border-r border-slate-300 text-xs font-bold text-red-600 text-center whitespace-nowrap">{order.plate_no || '-'}</td>
                                <td className="px-3 py-2 border-r border-slate-300 text-xs font-normal text-slate-700 text-center">{order.paper_order_size || '-'}</td>
                                <td className="px-3 py-2 border-r border-slate-300 text-xs font-normal text-slate-700 text-center">{(order.paper_order_qty || 0).toLocaleString()}</td>
                                <td className="px-3 py-2 text-xs text-slate-700 text-center font-normal">{order.paper_ups || '-'}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={11} className="text-center py-20 text-slate-400 font-medium italic">
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
                    body { background: white; }
                    .print\\:hidden { display: none !important; }
                    table { border-collapse: collapse !important; border: 2px solid #000 !important; width: 100% !important; }
                    th, td { border: 1px solid #000 !important; padding: 6px !important; color: black !important; }
                    th { background-color: #e2e8f0 !important; -webkit-print-color-adjust: exact; font-weight: bold !important; }
                }
            `}</style>
        </div>
    );
}

export default function PrinterSummaryPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
                <p className="text-slate-500 font-medium tracking-wide">Loading...</p>
            </div>
        }>
            <PrinterSummaryContent />
        </Suspense>
    );
}
