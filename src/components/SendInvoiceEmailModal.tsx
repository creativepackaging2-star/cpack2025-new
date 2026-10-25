'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Send, X, Check, Plus, Trash2, Loader2, Paperclip, CheckCircle2, Package, FileText } from 'lucide-react';

const DEFAULT_RECIPIENTS = [
    'kiran@bdrpharma.com',
    'agarwadkar@bdrpharma.com',
    'narayan.parab@bdrpharma.com',
    'prameshshah@gmail.com'
];

interface SendInvoiceEmailModalProps {
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
        pdf_url?: string;
        po_number?: string;
        total_boxes?: number;
    } | null;
}

export function formatToDDMMYYYY(dateStr?: string | null): string {
    if (!dateStr) {
        const now = new Date();
        return `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
    }
    const s = dateStr.trim();
    // If already DD-MM-YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return s;
    // If YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        const [y, m, d] = s.slice(0, 10).split('-');
        return `${d}-${m}-${y}`;
    }
    // If DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
        return s.replace(/\//g, '-');
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
        return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    }
    return s;
}

export function detectPlant(shipToAddress?: string | null, customerName?: string | null): string {
    const combined = `${shipToAddress || ''} ${customerName || ''}`.toLowerCase();
    if (combined.includes('halol')) return 'BDR Halol';
    if (combined.includes('padra')) return 'BDR Padra';

    const cust = (customerName || '').trim();
    if (combined.includes('bdr')) {
        return 'BDR Pharmaceuticals';
    }
    return cust || 'Client Site';
}

export function detectSenderCompany(companyStr?: string | null): string {
    const c = (companyStr || '').toLowerCase();
    if (c.includes('print')) return 'Creative Printers';
    if (c.includes('enter')) return 'Creative Enterprise';
    return 'Creative Packaging';
}

export default function SendInvoiceEmailModal({ isOpen, onClose, invoice }: SendInvoiceEmailModalProps) {
    const [recipientList, setRecipientList] = useState<string[]>(DEFAULT_RECIPIENTS);
    const [selectedRecipients, setSelectedRecipients] = useState<string[]>(DEFAULT_RECIPIENTS);
    const [newEmailInput, setNewEmailInput] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [sentSuccess, setSentSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Load saved custom recipients from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('cpack_invoice_recipients');
            if (saved) {
                const parsed: string[] = JSON.parse(saved);
                const merged = Array.from(new Set([...DEFAULT_RECIPIENTS, ...parsed]));
                setRecipientList(merged);
                setSelectedRecipients(merged);
            }
        } catch (e) {
            console.error('Failed to load saved invoice recipients:', e);
        }
    }, []);

    // Set initial subject and body when invoice opens
    useEffect(() => {
        if (invoice) {
            const invNo = invoice.invoice_number;
            const comp = detectSenderCompany(invoice.company);
            const plant = detectPlant(invoice.delivery_address, invoice.customer_name);
            const formattedDate = formatToDDMMYYYY(invoice.date);

            setSubject(`Dispatch Documents & Tax Invoice ${invNo} - ${plant}`);

            // Build products text list
            let productsText = '';
            if (invoice.orders && invoice.orders.length > 0) {
                productsText = invoice.orders.map(o => {
                    const qty = Number(o.qty_delivered || o.quantity || 0).toLocaleString();
                    const pack = o.packing_detail ? ` (Packing: ${o.packing_detail})` : '';
                    return `- ${o.product_name}: ${qty} pcs${pack}`;
                }).join('\n');
            }

            const exactMsg = `Dear Team,

Please find attached the Tax Invoice, Certificates of Analysis & E-way Bill.

Invoice Details:
Invoice No: ${invNo}
Invoice Date: ${formattedDate}
Plant: ${plant}

Dispatched Products:
${productsText || '- Dispatched products as per invoice'}

Kindly acknowledge receipt.

Regards,
Accounts Department
${comp}`;

            setMessage(exactMsg);
            setSentSuccess(false);
            setErrorMessage(null);
        }
    }, [invoice]);

    if (!isOpen || !invoice) return null;

    const toggleRecipient = (email: string) => {
        setSelectedRecipients(prev =>
            prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
        );
    };

    const handleAddRecipient = () => {
        const clean = newEmailInput.trim().toLowerCase();
        if (!clean) return;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
            alert('Please enter a valid email address.');
            return;
        }

        if (!recipientList.includes(clean)) {
            const updated = [...recipientList, clean];
            setRecipientList(updated);
            setSelectedRecipients(prev => [...prev, clean]);

            // Save custom additions (excluding defaults)
            const customOnly = updated.filter(e => !DEFAULT_RECIPIENTS.includes(e));
            try {
                localStorage.setItem('cpack_invoice_recipients', JSON.stringify(customOnly));
            } catch (e) {
                console.error(e);
            }
        } else if (!selectedRecipients.includes(clean)) {
            setSelectedRecipients(prev => [...prev, clean]);
        }

        setNewEmailInput('');
    };

    const handleRemoveRecipient = (emailToRemove: string) => {
        const updated = recipientList.filter(e => e !== emailToRemove);
        setRecipientList(updated);
        setSelectedRecipients(prev => prev.filter(e => e !== emailToRemove));

        const customOnly = updated.filter(e => !DEFAULT_RECIPIENTS.includes(e));
        try {
            localStorage.setItem('cpack_invoice_recipients', JSON.stringify(customOnly));
        } catch (e) {
            console.error(e);
        }
    };

    const handleSendEmail = async () => {
        if (selectedRecipients.length === 0) {
            setErrorMessage('Please select at least one recipient.');
            return;
        }

        setSending(true);
        setErrorMessage(null);

        const companyName = detectSenderCompany(invoice.company);
        const plantName = detectPlant(invoice.delivery_address, invoice.customer_name);
        const formattedDate = formatToDDMMYYYY(invoice.date);

        try {
            const res = await fetch('/api/send-invoice-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipients: selectedRecipients,
                    subject,
                    message,
                    invoiceNo: invoice.invoice_number,
                    invoiceDate: formattedDate,
                    plant: plantName,
                    customerName: invoice.customer_name,
                    company: companyName,
                    products: (invoice.orders || []).map(o => ({
                        name: o.product_name,
                        quantity: o.qty_delivered || o.quantity || 0,
                        packing: o.packing_detail,
                    })),
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to send invoice email.');
            }

            setSentSuccess(true);
            setTimeout(() => {
                onClose();
            }, 2200);

        } catch (err: any) {
            console.error('Email send failed:', err);
            setErrorMessage(err.message || 'Something went wrong while sending the email.');
        } finally {
            setSending(false);
        }
    };

    const attachmentFilename = `Dispatch_Documents_${invoice.invoice_number}.pdf`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-600 rounded-xl shadow-inner">
                            <Mail className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold uppercase tracking-tight">Email Sales Invoice & COAs</h3>
                                <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-400/30">
                                    {invoice.invoice_number}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400">
                                Send unified Tax Invoices, official COAs & E-way Bill details to customer contacts
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto space-y-5 flex-1">

                    {/* Recipient Selection Section */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                <span>Recipients</span>
                                <span className="text-[10px] font-normal text-slate-500 lowercase">({selectedRecipients.length} selected)</span>
                            </label>
                            <span className="text-[11px] text-slate-500">Click chips to toggle or add new</span>
                        </div>

                        {/* Recipient Chips */}
                        <div className="flex flex-wrap gap-2 mb-3">
                            {recipientList.map(email => {
                                const isSelected = selectedRecipients.includes(email);
                                const isCustom = !DEFAULT_RECIPIENTS.includes(email);
                                return (
                                    <div
                                        key={email}
                                        onClick={() => toggleRecipient(email)}
                                        className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all border ${
                                            isSelected
                                                ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-xs'
                                                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                                        }`}
                                    >
                                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border text-[9px] ${
                                            isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                                        }`}>
                                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                        </div>
                                        <span>{email}</span>
                                        {isCustom && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveRecipient(email);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-600 transition-opacity ml-0.5"
                                                title="Delete email"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Add custom email input */}
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    type="email"
                                    placeholder="Add custom email address (e.g. accounts@bdrpharma.com)..."
                                    value={newEmailInput}
                                    onChange={e => setNewEmailInput(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddRecipient();
                                        }
                                    }}
                                    className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleAddRecipient}
                                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add</span>
                            </button>
                        </div>
                    </div>

                    {/* Subject Line */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Subject
                        </label>
                        <input
                            type="text"
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                    </div>

                    {/* Email Body */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Message Body
                        </label>
                        <textarea
                            rows={12}
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors leading-relaxed"
                        />
                    </div>

                    {/* Attached Document Card */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg border border-rose-200">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-800">{attachmentFilename}</span>
                                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-300">
                                        Tax Invoices + COAs + E-way Bill
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Unified 3-Copy Invoices & official Client COA documents
                                </p>
                            </div>
                        </div>

                        {invoice.pdf_available && invoice.pdf_url && (
                            <a
                                href={invoice.pdf_url}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 transition-colors"
                            >
                                Preview PDF
                            </a>
                        )}
                    </div>

                    {/* Status Feedback */}
                    {errorMessage && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-700 animate-in fade-in">
                            {errorMessage}
                        </div>
                    )}

                    {sentSuccess && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Invoice and dispatch documents successfully emailed to all selected recipients!</span>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={sending}
                        className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-white transition-colors cursor-pointer"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleSendEmail}
                        disabled={sending || selectedRecipients.length === 0 || sentSuccess}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer"
                    >
                        {sending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Sending Email with Attachments...</span>
                            </>
                        ) : sentSuccess ? (
                            <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                                <span>Email Sent!</span>
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                <span>Send Invoice Email</span>
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}
