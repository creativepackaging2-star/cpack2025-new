'use client';

import { useState, useEffect } from 'react';
import { Mail, Send, X, Check, Plus, Trash2, Loader2, Paperclip, CheckCircle2 } from 'lucide-react';
import { PdfLogo } from './FileLogos';

const DEFAULT_RECIPIENTS = [
    'kiran@bdrpharma.com',
    'artwork@bdrpharma.com',
    'artwork1@bdrpharma.com'
];

interface SendArtworkModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: {
        id: string;
        product_name?: string | null;
        artwork_code?: string | null;
        artwork_pdf?: string | null;
    } | null;
}

export default function SendArtworkModal({ isOpen, onClose, product }: SendArtworkModalProps) {
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
            const saved = localStorage.getItem('cpack_artwork_recipients');
            if (saved) {
                const parsed: string[] = JSON.parse(saved);
                const merged = Array.from(new Set([...DEFAULT_RECIPIENTS, ...parsed]));
                setRecipientList(merged);
                setSelectedRecipients(merged);
            }
        } catch (e) {
            console.error('Failed to load saved recipients:', e);
        }
    }, []);

    // Set initial subject and body when product opens
    useEffect(() => {
        if (product) {
            const pName = product.product_name || 'Product';
            const pCode = product.artwork_code ? ` (${product.artwork_code})` : '';
            setSubject(`Artwork Approval Request: ${pName}${pCode}`);
            setMessage(`Dear Team,\n\nPlease find attached the artwork for "${pName}" for your review and approval.\n\nKindly verify and revert with your approval.\n\nRegards,\nCreative Packaging`);
            setSentSuccess(false);
            setErrorMessage(null);
        }
    }, [product]);

    if (!isOpen || !product) return null;

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

            // Save custom recipients
            try {
                const customs = updated.filter(e => !DEFAULT_RECIPIENTS.includes(e));
                localStorage.setItem('cpack_artwork_recipients', JSON.stringify(customs));
            } catch (e) {
                console.error(e);
            }
        } else if (!selectedRecipients.includes(clean)) {
            setSelectedRecipients(prev => [...prev, clean]);
        }
        setNewEmailInput('');
    };

    const handleRemoveCustomRecipient = (emailToRemove: string) => {
        if (DEFAULT_RECIPIENTS.includes(emailToRemove)) return; // Don't delete base defaults
        const updated = recipientList.filter(e => e !== emailToRemove);
        setRecipientList(updated);
        setSelectedRecipients(prev => prev.filter(e => e !== emailToRemove));

        try {
            const customs = updated.filter(e => !DEFAULT_RECIPIENTS.includes(e));
            localStorage.setItem('cpack_artwork_recipients', JSON.stringify(customs));
        } catch (e) {
            console.error(e);
        }
    };

    const handleSend = async () => {
        if (selectedRecipients.length === 0) {
            setErrorMessage('Please select at least one recipient email.');
            return;
        }
        if (!product.artwork_pdf) {
            setErrorMessage('No artwork PDF link found for this product.');
            return;
        }

        setSending(true);
        setErrorMessage(null);

        try {
            const res = await fetch('/api/send-artwork-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipients: selectedRecipients,
                    subject,
                    message,
                    pdfUrl: product.artwork_pdf,
                    productName: product.product_name,
                    artworkCode: product.artwork_code,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to send email');
            }

            setSentSuccess(true);
            setTimeout(() => {
                onClose();
            }, 2500);
        } catch (err: any) {
            setErrorMessage(err.message || 'An error occurred while sending the email.');
        } finally {
            setSending(false);
        }
    };

    const cleanFilename = `${(product.product_name || 'Artwork').replace(/[/\\?%*:|"<>]/g, '').trim()}.pdf`;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh]">
                
                {/* Header */}
                <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-lg">
                            <Mail className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold uppercase tracking-tight">Send Artwork for Approval</h3>
                            <p className="text-xs text-slate-400">Sent from creativepackaging2@gmail.com with PDF attachment</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-5 flex-1">
                    {/* Error Banner */}
                    {errorMessage && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
                            <X className="w-4 h-4 shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {/* Success Banner */}
                    {sentSuccess && (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in zoom-in-95">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            <span>Email sent successfully with PDF attachment to {selectedRecipients.length} recipients!</span>
                        </div>
                    )}

                    {/* Product & PDF Attachment Badge */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <PdfLogo className="w-7 h-7 shrink-0" />
                            <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 truncate">
                                    {product.product_name || 'Product'}
                                </div>
                                <div className="text-[11px] font-mono text-slate-500">
                                    Code: {product.artwork_code || '-'}
                                </div>
                            </div>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-lg shrink-0">
                            <Paperclip className="w-3 h-3" />
                            {cleanFilename}
                        </span>
                    </div>

                    {/* Recipients Selection */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Select Recipients ({selectedRecipients.length} selected)
                            </label>
                            <span className="text-[11px] text-slate-400">Click to select/unselect</span>
                        </div>

                        {/* Chips / Checkbox list */}
                        <div className="space-y-1.5 max-h-40 overflow-y-auto p-1 border border-slate-200 rounded-xl bg-slate-50/50">
                            {recipientList.map(email => {
                                const isChecked = selectedRecipients.includes(email);
                                const isCustom = !DEFAULT_RECIPIENTS.includes(email);

                                return (
                                    <div
                                        key={email}
                                        onClick={() => toggleRecipient(email)}
                                        className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition text-xs select-none ${
                                            isChecked
                                                ? 'bg-indigo-50 border border-indigo-200 text-indigo-950 font-semibold'
                                                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                                                isChecked
                                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                                    : 'border-slate-300 bg-white'
                                            }`}>
                                                {isChecked && <Check className="w-3 h-3" />}
                                            </div>
                                            <span>{email}</span>
                                            {DEFAULT_RECIPIENTS.includes(email) && (
                                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                                    Fixed
                                                </span>
                                            )}
                                        </div>

                                        {isCustom && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveCustomRecipient(email);
                                                }}
                                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                                                title="Remove this email"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Add New Recipient Input */}
                        <div className="flex gap-2 pt-1">
                            <input
                                type="email"
                                placeholder="Add another recipient email..."
                                value={newEmailInput}
                                onChange={e => setNewEmailInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddRecipient();
                                    }
                                }}
                                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
                            />
                            <button
                                type="button"
                                onClick={handleAddRecipient}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 rounded-xl text-xs font-bold transition cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add</span>
                            </button>
                        </div>
                    </div>

                    {/* Subject */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Subject Line</label>
                        <input
                            type="text"
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
                        />
                    </div>

                    {/* Message Body */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Message</label>
                        <textarea
                            rows={4}
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={sending}
                        className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleSend}
                        disabled={sending || sentSuccess || selectedRecipients.length === 0}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-md active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                    >
                        {sending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Sending Email...</span>
                            </>
                        ) : sentSuccess ? (
                            <>
                                <Check className="w-4 h-4" />
                                <span>Sent!</span>
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                <span>Send Approval Email</span>
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}
