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
            clone.style.width = '650px'; // Reduced width for compact view
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

            <div id="printer-summary-table" style={{ backgroundColor: '#ffffff', borderRadius: '1rem', border: '1px solid #e2e8f0', padding: '4px' }} className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }} className="text-left">
                            <th style={{ borderRight: '1px solid #334155', padding: '6px 2px' }} className="text-[9px] font-normal text-center w-6">Sr.</th>
                            <th style={{ borderRight: '1px solid #334155', padding: '6px 4px' }} className="text-[9px] font-normal min-w-[150px]">Product</th>
                            <th style={{ borderRight: '1px solid #334155', padding: '6px 2px' }} className="text-[9px] font-normal text-center">GSM</th>
                            <th style={{ borderRight: '1px solid #334155', padding: '6px 2px' }} className="text-[9px] font-normal">Paper Type</th>
                            <th style={{ borderRight: '1px solid #334155', padding: '6px 2px' }} className="text-[9px] font-normal text-center">Size</th>
                            <th style={{ borderRight: '1px solid #334155', padding: '6px 2px' }} className="text-[9px] font-normal text-center">Print Qty</th>
                            <th style={{ borderRight: '1px solid #334155', padding: '6px 2px' }} className="text-[9px] font-normal">Ink</th>
                            <th style={{ borderRight: '1px solid #334155', padding: '6px 2px' }} className="text-[9px] font-normal text-center">Plate</th>
                            <th style={{ borderRight: '1px solid #334155', padding: '6px 2px' }} className="text-[9px] font-normal text-center">P. Ord</th>
                            <th style={{ borderRight: '1px solid #334155', padding: '6px 2px' }} className="text-[9px] font-normal text-center">P. Qty</th>
                            <th style={{ borderRight: '1px solid #334155', padding: '6px 2px' }} className="text-[9px] font-normal text-center">UPS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.length > 0 ? filteredOrders.map((order, index) => (
                            <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ borderRight: '1px solid #f8fafc', color: '#64748b', padding: '4px 2px' }} className="text-[9px] text-center">{index + 1}</td>
                                <td style={{ borderRight: '1px solid #f8fafc', padding: '4px 4px' }} className="text-xs">
                                    <div style={{ color: '#0f172a', fontWeight: 700 }} className="leading-tight">{order.products?.product_name || order.product_name}</div>
                                    <div style={{ color: '#94a3b8', fontSize: '9px' }} className="uppercase mt-0.5">{order.products?.artwork_code || order.artwork_code || '-'}</div>
                                </td>
                                <td style={{ borderRight: '1px solid #f8fafc', color: '#334155', padding: '4px 2px' }} className="text-[10px] text-center">{order.gsm_value || order.products?.actual_gsm_used || '-'}</td>
                                <td style={{ borderRight: '1px solid #f8fafc', color: '#334155', padding: '4px 2px' }} className="text-[10px]">{order.paper_type_name || '-'}</td>
                                <td style={{ borderRight: '1px solid #f8fafc', color: '#1e293b', fontWeight: 700, padding: '4px 2px' }} className="text-[10px] text-center">{order.print_size || '-'}</td>
                                <td style={{ borderRight: '1px solid #f8fafc', color: '#047857', fontWeight: 900, padding: '4px 2px' }} className="text-[10px] text-center">{(order.total_print_qty || 0).toLocaleString()}</td>
                                <td style={{ borderRight: '1px solid #f8fafc', color: '#475569', padding: '4px 2px' }} className="text-[9px] leading-tight max-w-[150px]">{order.ink || '-'}</td>
                                <td style={{ borderRight: '1px solid #f8fafc', color: '#dc2626', fontWeight: 700, padding: '4px 2px' }} className="text-[10px] text-center whitespace-nowrap">{order.plate_no || '-'}</td>
                                <td style={{ borderRight: '1px solid #f8fafc', color: '#334155', padding: '4px 2px' }} className="text-[10px] text-center">{order.paper_order_size || '-'}</td>
                                <td style={{ borderRight: '1px solid #f8fafc', color: '#334155', padding: '4px 2px' }} className="text-[10px] text-center">{(order.paper_order_qty || 0).toLocaleString()}</td>
                                <td style={{ borderRight: '1px solid #f8fafc', color: '#334155', padding: '4px 2px' }} className="text-[10px] text-center">{order.paper_ups || '-'}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={11} style={{ padding: '80px 0', backgroundColor: '#f8fafc', color: '#94a3b8' }} className="text-center font-bold uppercase tracking-widest italic">
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
                    #printer-summary-table { box-shadow: none !important; border: 1.5px solid #000 !important; }
                    table { border-collapse: collapse !important; width: 100% !important; }
                    th, td { border: 1px solid #000 !important; padding: 6px !important; color: black !important; }
                    th { background-color: #000 !important; color: white !important; -webkit-print-color-adjust: exact; }
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
