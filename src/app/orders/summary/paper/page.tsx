'use client';

import { useEffect, useState, Suspense, useMemo, useCallback } from 'react';
import { supabase } from '@/utils/supabase/client';
import { Loader2, ChevronLeft, Truck, MessageCircle, Camera } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import html2canvas from 'html2canvas';

type PaperwalaType = {
    id: number | string;
    name: string;
    phone?: string;
};

function PaperSummaryContent() {
    const searchParams = useSearchParams();
    const idsString = searchParams.get('ids');
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPaperwala, setSelectedPaperwala] = useState<PaperwalaType | null>(null);
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

            const { data, error } = await query.order('paper_type_name', { ascending: true });

            if (error) throw error;
            setOrders(data || []);
        } catch (err) {
            console.error('Error fetching paper summary:', err);
        } finally {
            setLoading(false);
        }
    }

    // Derive active paperwalas
    const activePaperwalas = useMemo(() => {
        if (orders.length === 0) return [];
        const unique = new Map<string, PaperwalaType>();

        orders.forEach(o => {
            if (o.paperwala_id || o.paperwala_name) {
                const id = o.paperwala_id || o.paperwala_name;
                if (!unique.has(String(id))) {
                    unique.set(String(id), {
                        id: id,
                        name: o.paperwala_name || 'Unknown',
                        phone: o.paperwala_mobile
                    });
                }
            }
        });
        return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [orders]);

    // Filter
    const filteredOrders = useMemo(() => {
        if (!selectedPaperwala) return orders;
        return orders.filter(o =>
            String(o.paperwala_id) === String(selectedPaperwala.id) ||
            o.paperwala_name === selectedPaperwala.name
        );
    }, [orders, selectedPaperwala]);

    // Auto-select
    useEffect(() => {
        if (activePaperwalas.length > 0 && !selectedPaperwala) {
            setSelectedPaperwala(activePaperwalas[0]);
        }
    }, [activePaperwalas, selectedPaperwala]);

    const generateMessage = useCallback(() => {
        if (!selectedPaperwala) return '';

        let message = `*PAPER ORDER SUMMARY*\n`;
        message += `*To:* ${selectedPaperwala.name}\n`;
        message += `--------------------------------\n`;

        filteredOrders.forEach((o, i) => {
            message += `${i + 1}. *${o.paper_type_name || 'Paper'}* | ${o.gsm_value || '-'} GSM\n`;
            message += `   Size: ${o.paper_order_size || '-'} | Qty: *${(o.paper_order_qty || 0).toLocaleString()}*\n`;
            message += `   Del. at: ${o.printer_name || 'Stock'}\n`;
            message += `--------------------------------\n`;
        });

        return message;
    }, [selectedPaperwala, filteredOrders]);

    const waUrl = useMemo(() => {
        if (!selectedPaperwala || filteredOrders.length === 0) return "#";
        const message = generateMessage();
        let phone = String(selectedPaperwala.phone || '').replace(/\D/g, '');
        if (!phone) return "#";
        if (phone.length === 10) phone = '91' + phone;
        return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
    }, [selectedPaperwala, filteredOrders, generateMessage]);

    const sendWhatsAppImage = async () => {
        if (!selectedPaperwala || waUrl === "#") return;
        setIsGenerating(true);
        try {
            const tableElement = document.getElementById('paper-summary-table');
            if (!tableElement) throw new Error('Table not found.');

            const clone = tableElement.cloneNode(true) as HTMLElement;
            clone.style.position = 'absolute';
            clone.style.left = '-9999px';
            clone.style.top = '0';
            clone.style.width = '700px';
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

            const file = new File([blob], `Paper_Summary_${new Date().getTime()}.png`, { type: 'image/png' });
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Paper Summary',
                    text: 'Here is the Paper Summary table.'
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
            <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
            <p className="text-slate-500 font-medium">Calculating Paper Requirements...</p>
        </div>
    );

    return (
        <div className="p-4 md:p-8 max-w-[1200px] mx-auto font-montserrat">
            <div className="flex flex-wrap items-center justify-between mb-8 gap-6 print:hidden">
                <div className="flex items-center gap-4">
                    <Link href="/orders" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <ChevronLeft className="w-6 h-6 text-slate-600" />
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Truck className="w-8 h-8 text-emerald-600 bg-emerald-50 p-1.5 rounded-lg" />
                        Paper Order Summary
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-4 bg-white p-3 border border-slate-200 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-4 px-3 border-r border-slate-200">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Selected Supplier</span>
                            <select
                                className="text-sm font-black text-emerald-600 outline-none bg-transparent min-w-[200px] cursor-pointer"
                                value={selectedPaperwala?.id.toString() || ""}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const p = activePaperwalas.find(pr => String(pr.id) === val);
                                    if (p) setSelectedPaperwala(p);
                                }}
                            >
                                <option value="">Select Paperwala...</option>
                                {activePaperwalas.map(p => (
                                    <option key={String(p.id)} value={String(p.id)}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col border-l pl-4 border-slate-100">
                            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">WhatsApp</span>
                            <span className="text-sm font-bold text-slate-700 font-mono italic">
                                {selectedPaperwala?.phone || 'N/A'}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={sendWhatsAppImage}
                            disabled={isGenerating || waUrl === "#"}
                            className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-bold text-sm hover:bg-indigo-700 transition-all shadow-md flex items-center gap-2 active:scale-95 disabled:opacity-50"
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
                                    alert("Please select a supplier with a phone number.");
                                }
                            }}
                            className={`px-6 py-2.5 rounded-lg font-black text-sm transition-all shadow-lg flex items-center gap-2 active:scale-95 ${waUrl === "#" ? 'bg-slate-100 text-slate-400 pointer-events-none' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100'}`}
                        >
                            <MessageCircle className="w-4 h-4" />
                            WHATSAPP
                        </a>

                        <button
                            onClick={() => window.print()}
                            className="bg-slate-700 text-white px-4 py-2.5 rounded-lg font-bold text-sm hover:bg-slate-800 transition-all shadow-md flex items-center gap-2 active:scale-95"
                        >
                            <Truck className="w-4 h-4" />
                            PRINT
                        </button>
                    </div>
                </div>
            </div>

            <div id="paper-summary-table" className="overflow-x-auto bg-white rounded-xl border border-slate-300 shadow-sm p-1">
                <table className="w-full border-collapse text-left">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-300">
                            <th className="px-4 py-3 border-r border-slate-300 text-[11px] font-normal uppercase text-slate-700 w-[50px] text-center">Sr.</th>
                            <th className="px-4 py-3 border-r border-slate-300 text-[11px] font-normal uppercase text-slate-700 w-[80px] text-center">GSM</th>
                            <th className="px-4 py-3 border-r border-slate-300 text-[11px] font-normal uppercase text-slate-700">Paper</th>
                            <th className="px-4 py-3 border-r border-slate-300 text-[11px] font-normal uppercase text-slate-700 text-center">Paper ord</th>
                            <th className="px-4 py-3 border-r border-slate-300 text-[11px] font-normal uppercase text-slate-700 text-center">Paper Ord</th>
                            <th className="px-4 py-3 border-r border-slate-300 text-[11px] font-normal uppercase text-slate-700">Del. At (Printer)</th>
                            <th className="px-4 py-3 text-[11px] font-normal uppercase text-slate-700 text-center">Ref</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                        {filteredOrders.length > 0 ? filteredOrders.map((order, index) => (
                            <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 border-r border-slate-300 text-xs font-normal text-slate-500 text-center">{index + 1}</td>
                                <td className="px-4 py-3 border-r border-slate-300 text-xs font-normal text-slate-700 text-center">{order.gsm_value || order.products?.actual_gsm_used || '-'}</td>
                                <td className="px-4 py-3 border-r border-slate-300 text-xs font-bold text-slate-900">{order.paper_type_name || '-'}</td>
                                <td className="px-4 py-3 border-r border-slate-300 text-xs font-normal text-slate-700 text-center">{order.paper_order_size || '-'}</td>
                                <td className="px-4 py-3 border-r border-slate-300 text-xs font-black text-emerald-600 text-center">{(order.paper_order_qty || 0).toLocaleString()}</td>
                                <td className="px-4 py-3 border-r border-slate-100 text-xs font-normal text-slate-700">{order.printer_name || 'Stock'}</td>
                                <td className="px-4 py-3 text-xs font-semibold text-indigo-600 text-center uppercase tracking-widest whitespace-nowrap">
                                    {(order.products?.product_name || order.product_name || '').substring(0, 3)}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={7} className="text-center py-20 text-slate-400 font-medium italic">
                                    No pending paper requirements found for this supplier.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <style jsx global>{`
                @media print {
                    @page { margin: 1cm; }
                    body { background: white; }
                    .print\\:hidden { display: none !important; }
                    table { border-collapse: collapse !important; border: 2px solid #000 !important; width: 100% !important; }
                    th, td { border: 1px solid #000 !important; padding: 6px !important; color: black !important; }
                    th { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; font-weight: bold !important; }
                }
            `}</style>
        </div>
    );
}

export default function PaperSummaryPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
                <p className="text-slate-500 font-medium tracking-wide">Loading...</p>
            </div>
        }>
            <PaperSummaryContent />
        </Suspense>
    );
}
