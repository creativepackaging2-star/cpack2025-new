'use client';

import React, { useState, useEffect } from 'react';
import { Send, X, Loader2, CheckCircle2, AlertCircle, FileText, Users, Phone, Settings, Sparkles } from 'lucide-react';
import { WhatsAppLogo } from '@/components/FileLogos';
import { detectPlant, formatToDDMMYYYY } from '@/components/SendInvoiceEmailModal';

interface SendWhatsAppModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: {
        invoice_number: string;
        date?: string;
        customer_name?: string;
        delivery_address?: string;
        company?: string;
        orders?: any[];
        pdf_available?: boolean;
        po_number?: string;
        total_boxes?: number;
    } | null;
}

export default function SendWhatsAppModal({ isOpen, onClose, invoice }: SendWhatsAppModalProps) {
    const [target, setTarget] = useState('');
    const [caption, setCaption] = useState('');
    const [providerStatus, setProviderStatus] = useState<{ configured: boolean; provider: string; defaultTarget?: string } | null>(null);
    const [loadingConfig, setLoadingConfig] = useState(true);
    const [sending, setSending] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setSuccessMessage('');
            setErrorMessage('');
            return;
        }

        // Fetch WhatsApp configuration status
        setLoadingConfig(true);
        fetch('/api/send-dispatch-whatsapp')
            .then(res => res.json())
            .then(data => {
                setProviderStatus(data);
                if (data.defaultTarget) {
                    setTarget(data.defaultTarget);
                }
            })
            .catch(err => {
                console.warn('Failed to load WhatsApp config status:', err);
            })
            .finally(() => setLoadingConfig(false));

        // Pre-fill caption
        if (invoice) {
            const plant = detectPlant(invoice.delivery_address, invoice.customer_name);
            const formattedDate = formatToDDMMYYYY(invoice.date);
            const prods = (invoice.orders || []).map(o => `• *${o.product_name}* (${Number(o.qty_delivered || o.quantity || 0).toLocaleString()} pcs)`).join('\n');

            const text = `📄 *Dispatch Documents - ${invoice.invoice_number}*\n` +
                `🏢 *Billing Company:* ${invoice.company || 'Creative Packaging'}\n` +
                `👤 *Customer:* ${invoice.customer_name || 'BDR Pharmaceuticals'}\n` +
                `🏭 *Plant / Site:* ${plant}\n` +
                `📅 *Dispatch Date:* ${formattedDate}\n` +
                (invoice.po_number ? `📑 *PO Number:* ${invoice.po_number}\n` : '') +
                (invoice.total_boxes ? `📦 *Total Boxes:* ${invoice.total_boxes}\n` : '') +
                `\n*Items Dispatched:*\n${prods || 'Standard order items'}\n\n` +
                `📎 *Attached:* Official 3-Copy Tax Invoice & Certified COAs\n` +
                `_Automated dispatch from Creative Group Operations_`;

            setCaption(text);
        }
    }, [isOpen, invoice]);

    if (!isOpen || !invoice) return null;

    const attachmentFilename = `Dispatch_Documents_${invoice.invoice_number}.pdf`;

    const handleSend = async () => {
        if (!target.trim()) {
            setErrorMessage('Please enter a WhatsApp phone number or Group ID.');
            return;
        }

        setSending(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            const res = await fetch('/api/send-dispatch-whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invoiceNo: invoice.invoice_number,
                    target: target.trim(),
                    caption: caption,
                    customerName: invoice.customer_name,
                    plant: detectPlant(invoice.delivery_address, invoice.customer_name),
                    products: invoice.orders || [],
                }),
            });

            const data = await res.json();
            if (!res.ok || data.error) {
                throw new Error(data.error || 'Failed to deliver document via WhatsApp.');
            }

            setSuccessMessage(`Document sent successfully via ${data.provider?.toUpperCase() || 'WhatsApp'} to ${data.target}!`);
            setTimeout(() => {
                onClose();
            }, 2500);
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to send WhatsApp message.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-4 bg-emerald-950 text-white flex items-center justify-between shrink-0 border-b border-emerald-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-600 rounded-xl shadow-inner flex items-center justify-center">
                            <WhatsAppLogo className="w-5 h-5 text-white fill-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold uppercase tracking-tight">Send via WhatsApp</h3>
                                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                                    {invoice.invoice_number}
                                </span>
                            </div>
                            <p className="text-xs text-emerald-300/80">
                                Instantly send full compiled PDF (3 Invoices + COAs) to phone or group
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-emerald-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto space-y-4 flex-1">

                    {/* Configuration Banner if missing */}
                    {!loadingConfig && providerStatus && !providerStatus.configured && (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                            <div className="flex items-start gap-2.5 text-amber-900">
                                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wide">WhatsApp Gateway Not Configured</h4>
                                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                                        To send directly in the background without opening WhatsApp Web, add either <strong>UltraMsg</strong> or <strong>Evolution API</strong> keys to your <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900">.env.local</code>:
                                    </p>
                                </div>
                            </div>
                            <div className="p-2.5 bg-amber-100/60 rounded-lg text-[11px] font-mono text-amber-950 space-y-1">
                                <div># Option 1: UltraMsg</div>
                                <div>ULTRAMSG_INSTANCE_ID=instance12345</div>
                                <div>ULTRAMSG_TOKEN=your_token_here</div>
                                <div className="pt-1"># Option 2: Evolution API</div>
                                <div>EVOLUTION_API_URL=https://your-evo-api.com</div>
                                <div>EVOLUTION_API_KEY=your_api_key</div>
                                <div>EVOLUTION_INSTANCE_NAME=cpack</div>
                                <div className="pt-1"># Optional Default Group / Number</div>
                                <div>WHATSAPP_DEFAULT_TARGET=120363023456789012@g.us</div>
                            </div>
                        </div>
                    )}

                    {/* Active Provider Tag */}
                    {!loadingConfig && providerStatus?.configured && (
                        <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                            <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span>Gateway Connected:</span>
                                <span className="uppercase px-1.5 py-0.5 bg-emerald-200/70 text-emerald-900 rounded text-[10px]">
                                    {providerStatus.provider}
                                </span>
                            </div>
                            <span className="text-[11px] text-emerald-700">Ready to dispatch</span>
                        </div>
                    )}

                    {/* Target Recipient Input */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-slate-500" />
                                <span>Recipient Phone Number or Group ID</span>
                            </span>
                            <span className="text-[10px] font-normal text-slate-400 lowercase">e.g. 919876543210 or group@g.us</span>
                        </label>
                        <input
                            type="text"
                            value={target}
                            onChange={(e) => setTarget(e.target.value)}
                            placeholder="Enter 10-digit mobile number or WhatsApp Group ID..."
                            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-mono"
                        />
                        <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
                            <span className="font-semibold text-slate-700">Quick suggestions:</span>
                            <button
                                type="button"
                                onClick={() => setTarget('120363023456789012@g.us')}
                                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-mono transition-colors cursor-pointer"
                            >
                                Dispatch Group
                            </button>
                        </div>
                    </div>

                    {/* Attached File Card */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg border border-rose-200">
                                <FileText className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-900 truncate max-w-[280px]">
                                    {attachmentFilename}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                    Compiled 3 Invoices + Official COAs
                                </p>
                            </div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase">
                            Auto Attached
                        </span>
                    </div>

                    {/* Message / Caption Textarea */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                            <span>WhatsApp Message / Caption</span>
                            <span className="text-[10px] font-normal text-slate-400">supports *bold*, _italics_</span>
                        </label>
                        <textarea
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            rows={6}
                            className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all resize-none leading-relaxed"
                        />
                    </div>

                    {/* Error / Success Feedback */}
                    {errorMessage && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {successMessage && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-bold animate-in fade-in">
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                            <span>{successMessage}</span>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleSend}
                        disabled={sending || (!loadingConfig && !providerStatus?.configured)}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer ${
                            sending || (!loadingConfig && !providerStatus?.configured)
                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                                : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white shadow-emerald-600/20'
                        }`}
                    >
                        {sending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Sending Document...</span>
                            </>
                        ) : (
                            <>
                                <WhatsAppLogo className="w-4 h-4 text-white fill-white" />
                                <span>Send on WhatsApp</span>
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}
