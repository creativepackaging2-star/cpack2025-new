'use client';

import React, { useState } from 'react';
import { X, Mail, Plus, Loader2, CheckCircle2, AlertCircle, FileText } from 'lucide-react';

interface SendDeliveryLabelModalProps {
    isOpen: boolean;
    onClose: () => void;
    productName: string;
    deliveryAddress?: string | null;
    invoiceNo?: string | null;
    company?: 'Enterprise' | 'Printers' | 'Packaging';
    onEmailSentSuccess?: (recipients: string[]) => void;
}

export default function SendDeliveryLabelModal({
    isOpen,
    onClose,
    productName,
    deliveryAddress,
    invoiceNo,
    company = 'Packaging',
    onEmailSentSuccess,
}: SendDeliveryLabelModalProps) {
    // Default recipient is siddhilabels@gmail.com (user can edit/remove/add more)
    const [recipients, setRecipients] = useState<string[]>(['siddhilabels@gmail.com']);
    const [newEmailInput, setNewEmailInput] = useState('');
    const [subject, setSubject] = useState(`Dispatch Box Label - ${productName}`);
    const [message, setMessage] = useState(
        `Dear Sir / madam,\n\nPlease find attached dispatch box label for ${productName}.\n\nThanks,\nCreative Packaging`
    );

    const [isSending, setIsSending] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isSentSuccess, setIsSentSuccess] = useState(false);
    const [sentRecipients, setSentRecipients] = useState<string[]>([]);

    if (!isOpen) return null;

    const handleAddRecipient = () => {
        const trimmed = newEmailInput.trim();
        if (!trimmed) return;

        const parts = trimmed.split(/[,;\s]+/).filter(Boolean);
        const validEmails = parts.filter(p => p.includes('@'));

        if (validEmails.length === 0) {
            setErrorMsg('Please enter a valid email address.');
            return;
        }

        setRecipients(prev => {
            const next = [...prev];
            for (const email of validEmails) {
                if (!next.includes(email)) next.push(email);
            }
            return next;
        });
        setNewEmailInput('');
        setErrorMsg(null);
    };

    const handleRemoveRecipient = (emailToRemove: string) => {
        setRecipients(prev => prev.filter(e => e !== emailToRemove));
    };

    const handleSend = async () => {
        let finalRecipients = [...recipients];
        const pendingInput = newEmailInput.trim();
        if (pendingInput && pendingInput.includes('@') && !finalRecipients.includes(pendingInput)) {
            finalRecipients.push(pendingInput);
            setRecipients(finalRecipients);
            setNewEmailInput('');
        }

        if (finalRecipients.length === 0) {
            setErrorMsg('Please specify at least one recipient email address.');
            return;
        }

        setIsSending(true);
        setErrorMsg(null);

        try {
            const res = await fetch('/api/send-delivery-label-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipients: finalRecipients,
                    subject,
                    message,
                    productName,
                    deliveryAddress,
                    invoiceNo,
                    company,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to send email.');
            }

            setSentRecipients(finalRecipients);
            setIsSentSuccess(true);
            if (onEmailSentSuccess) {
                onEmailSentSuccess(finalRecipients);
            }
        } catch (err: any) {
            console.error('Send error:', err);
            setErrorMsg(err.message || 'An error occurred while sending the email.');
        } finally {
            setIsSending(false);
        }
    };

    const handleClose = () => {
        setIsSentSuccess(false);
        setErrorMsg(null);
        onClose();
    };

    const safeFilename = `${productName.replace(/[^a-zA-Z0-9_-]/g, '_')}_DeliveryLabel.pdf`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/30">
                            <Mail className="w-5 h-5 text-indigo-300" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base leading-tight">Send Delivery Label</h3>
                            <p className="text-xs text-indigo-200/80">Dispatches via creativepackaging2@gmail.com</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={isSending}
                        className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body: Success State or Input Form */}
                {isSentSuccess ? (
                    <div className="p-8 text-center flex flex-col items-center justify-center space-y-4 animate-in fade-in">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shadow-inner">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-xl font-black text-slate-900">Email Sent Successfully!</h4>
                            <p className="text-sm text-slate-600 max-w-sm">
                                Dispatch box label for <span className="font-bold text-indigo-700">{productName}</span> has been emailed in official A4 paper format to:
                            </p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-1.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl max-w-md">
                            {sentRecipients.map(e => (
                                <span key={e} className="px-3 py-1 bg-white text-emerald-800 border border-emerald-300 rounded-full text-xs font-bold shadow-xs">
                                    {e}
                                </span>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="mt-4 px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-lg active:scale-95 transition-all cursor-pointer"
                        >
                            Done
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="p-6 overflow-y-auto space-y-4 flex-1">
                            {errorMsg && (
                                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold">
                                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            {/* Recipients Section */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Recipients
                                </label>
                                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl min-h-[44px] items-center">
                                    {recipients.map(email => (
                                        <span
                                            key={email}
                                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-semibold"
                                        >
                                            <span>{email}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveRecipient(email)}
                                                className="text-indigo-400 hover:text-rose-600 transition-colors cursor-pointer"
                                                title="Remove recipient"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </span>
                                    ))}
                                    {recipients.length === 0 && (
                                        <span className="text-xs text-slate-400 italic px-2">No recipients added yet</span>
                                    )}
                                </div>

                                {/* Add custom email input */}
                                <div className="mt-2 flex gap-2">
                                    <input
                                        type="email"
                                        value={newEmailInput}
                                        onChange={e => setNewEmailInput(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' || e.key === ',') {
                                                e.preventDefault();
                                                handleAddRecipient();
                                            }
                                        }}
                                        placeholder="Add custom email (e.g. party@example.com)"
                                        className="flex-1 px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddRecipient}
                                        className="inline-flex items-center gap-1 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all active:scale-95 cursor-pointer"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add
                                    </button>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1">Default is siddhilabels@gmail.com. You can remove it or add multiple custom recipients.</p>
                            </div>

                            {/* Subject */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Subject
                                </label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-800"
                                />
                            </div>

                            {/* Message Body */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Message
                                </label>
                                <textarea
                                    rows={6}
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-700 resize-none font-mono"
                                />
                            </div>

                            {/* Attachment preview */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Attachment (A4 Format)
                                </label>
                                <div className="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                    <div className="p-2 bg-rose-50 text-rose-600 rounded-lg border border-rose-100">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-slate-800 truncate">{safeFilename}</p>
                                        <p className="text-[11px] text-slate-500">Official dispatch box delivery label (A4 Sheet PDF)</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Controls */}
                        <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-slate-50 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={isSending}
                                className="px-5 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSend}
                                disabled={isSending || recipients.length === 0}
                                className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Mail className="w-4 h-4" />
                                        Send Email
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
