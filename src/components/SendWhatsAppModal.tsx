'use client';

import React, { useState, useEffect } from 'react';
import { Send, X, Loader2, CheckCircle2, AlertCircle, FileText, Phone, Plus, Trash2, Settings, ShieldCheck } from 'lucide-react';
import { WhatsAppLogo } from '@/components/FileLogos';

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
    } | null;
}

export default function SendWhatsAppModal({ isOpen, onClose, invoice }: SendWhatsAppModalProps) {
    const [recipients, setRecipients] = useState<string[]>([]);
    const [newNumberInput, setNewNumberInput] = useState('');
    const [providerStatus, setProviderStatus] = useState<{ configured: boolean; provider: string; ultraInstance?: string; defaultTarget?: string } | null>(null);
    const [loadingConfig, setLoadingConfig] = useState(true);
    const [showSettings, setShowSettings] = useState(false);

    // Settings inputs
    const [instanceInput, setInstanceInput] = useState('');
    const [tokenInput, setTokenInput] = useState('');
    const [defaultTargetInput, setDefaultTargetInput] = useState('');
    const [savingSettings, setSavingSettings] = useState(false);
    const [settingsNotice, setSettingsNotice] = useState('');

    const [sending, setSending] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setSuccessMessage('');
            setErrorMessage('');
            setSettingsNotice('');
            return;
        }

        setLoadingConfig(true);
        fetch('/api/send-dispatch-whatsapp')
            .then(res => res.json())
            .then(data => {
                setProviderStatus(data);
                if (data.ultraInstance) setInstanceInput(data.ultraInstance);
                if (data.defaultTarget) {
                    setDefaultTargetInput(data.defaultTarget);
                    setRecipients(prev => prev.length === 0 ? [data.defaultTarget] : prev);
                }
                if (!data.configured) {
                    setShowSettings(true); // Open settings if not configured yet
                }
            })
            .catch(err => {
                console.warn('Failed to load WhatsApp config status:', err);
            })
            .finally(() => setLoadingConfig(false));
    }, [isOpen]);

    if (!isOpen || !invoice) return null;

    const attachmentFilename = `Dispatch_Documents_${invoice.invoice_number}.pdf`;

    const handleAddNumber = () => {
        const trimmed = newNumberInput.trim().replace(/\s+/g, '');
        if (!trimmed) return;

        if (recipients.includes(trimmed)) {
            setNewNumberInput('');
            return;
        }

        setRecipients(prev => [...prev, trimmed]);
        setNewNumberInput('');
    };

    const handleRemoveNumber = (num: string) => {
        setRecipients(prev => prev.filter(n => n !== num));
    };

    const handleSaveSettings = async () => {
        if (!instanceInput.trim() || !tokenInput.trim()) {
            setErrorMessage('Please enter both UltraMsg Instance ID and Token.');
            return;
        }

        setSavingSettings(true);
        setErrorMessage('');
        setSettingsNotice('');

        try {
            const res = await fetch('/api/send-dispatch-whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save_config',
                    ultraInstance: instanceInput.trim(),
                    ultraToken: tokenInput.trim(),
                    defaultTarget: defaultTargetInput.trim(),
                }),
            });
            const data = await res.json();
            if (!res.ok || data.error) {
                throw new Error(data.error || 'Failed to save UltraMsg settings.');
            }

            setProviderStatus(prev => ({
                configured: true,
                provider: 'ultramsg',
                ultraInstance: instanceInput.trim(),
                defaultTarget: defaultTargetInput.trim(),
            }));
            setSettingsNotice('UltraMsg gateway configured and ready!');
            setShowSettings(false);
            if (defaultTargetInput.trim() && !recipients.includes(defaultTargetInput.trim())) {
                setRecipients(prev => [...prev, defaultTargetInput.trim()]);
            }
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to save settings.');
        } finally {
            setSavingSettings(false);
        }
    };

    const handleSend = async () => {
        if (recipients.length === 0) {
            setErrorMessage('Please add at least one WhatsApp number or Group ID.');
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
                    targets: recipients,
                    caption: '', // No write up, just the PDF
                }),
            });

            const data = await res.json();
            if (!res.ok || data.error) {
                throw new Error(data.error || 'Failed to deliver PDF document.');
            }

            setSuccessMessage(`PDF document dispatched successfully to ${data.successCount} recipient(s)!`);
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
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-4 bg-emerald-950 text-white flex items-center justify-between shrink-0 border-b border-emerald-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-600 rounded-xl shadow-inner flex items-center justify-center">
                            <WhatsAppLogo className="w-5 h-5 text-white fill-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold uppercase tracking-tight">WhatsApp Dispatch</h3>
                                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                                    {invoice.invoice_number}
                                </span>
                            </div>
                            <p className="text-xs text-emerald-300/80">
                                Send compiled PDF directly in the background (No write up)
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setShowSettings(prev => !prev)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                showSettings ? 'bg-emerald-800 text-white' : 'text-emerald-400 hover:text-white'
                            }`}
                            title="WhatsApp Gateway Settings (UltraMsg)"
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-emerald-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto space-y-4 flex-1">

                    {/* Gateway Status / Settings Toggle Box */}
                    {showSettings && (
                        <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3 border border-slate-800 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">UltraMsg Gateway Configuration</h4>
                                </div>
                                <span className="text-[10px] text-slate-400">Recommended & Pre-configured</span>
                            </div>

                            <p className="text-[11px] text-slate-300 leading-relaxed">
                                Enter your UltraMsg instance details once. It sends directly to individual numbers and WhatsApp groups with no login required.
                            </p>

                            <div className="space-y-2 text-xs">
                                <div>
                                    <label className="text-[10px] text-slate-400 uppercase font-bold">Instance ID</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. instance12345"
                                        value={instanceInput}
                                        onChange={(e) => setInstanceInput(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-emerald-400 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 uppercase font-bold">Token</label>
                                    <input
                                        type="password"
                                        placeholder="your_ultramsg_token"
                                        value={tokenInput}
                                        onChange={(e) => setTokenInput(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-emerald-400 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 uppercase font-bold">Default Group / Number (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 120363023456789012@g.us or 919876543210"
                                        value={defaultTargetInput}
                                        onChange={(e) => setDefaultTargetInput(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-emerald-400 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setShowSettings(false)}
                                    className="px-3 py-1 text-[11px] text-slate-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveSettings}
                                    disabled={savingSettings}
                                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                                >
                                    {savingSettings ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                    <span>Save Gateway</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {settingsNotice && (
                        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{settingsNotice}</span>
                        </div>
                    )}

                    {/* Attached File Card */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg border border-rose-200">
                                <FileText className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-900 truncate max-w-[260px]">
                                    {attachmentFilename}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                    3 Copies Tax Invoice + Official COAs
                                </p>
                            </div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase">
                            Pure PDF
                        </span>
                    </div>

                    {/* Recipients Section */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-slate-500" />
                                <span>WhatsApp Numbers / Groups</span>
                                <span className="text-[10px] font-normal text-slate-500 lowercase">({recipients.length} selected)</span>
                            </label>
                            <span className="text-[11px] text-slate-500">Add multiple numbers below</span>
                        </div>

                        {/* Recipient Chips */}
                        <div className="flex flex-wrap gap-2 min-h-[36px] p-2 bg-slate-50 border border-slate-200 rounded-xl">
                            {recipients.length === 0 ? (
                                <span className="text-xs text-slate-400 italic py-0.5">No numbers added yet. Enter a number below.</span>
                            ) : (
                                recipients.map((num) => (
                                    <span
                                        key={num}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-emerald-200 rounded-lg text-xs font-mono text-emerald-950 font-bold shadow-xs"
                                    >
                                        <span>{num}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveNumber(num)}
                                            className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                            title="Remove number"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))
                            )}
                        </div>

                        {/* Add More Numbers Input */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newNumberInput}
                                onChange={(e) => setNewNumberInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddNumber();
                                    }
                                }}
                                placeholder="Enter mobile number or Group ID..."
                                className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                            />
                            <button
                                type="button"
                                onClick={handleAddNumber}
                                disabled={!newNumberInput.trim()}
                                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
                                    newNumberInput.trim()
                                        ? 'bg-slate-900 hover:bg-slate-800 text-white'
                                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                }`}
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add</span>
                            </button>
                        </div>
                    </div>

                    {/* Mode Notice: Pure PDF (No write up) */}
                    <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-emerald-900 leading-relaxed">
                            <strong>Pure Document Mode Active:</strong> Only the compiled PDF file will be delivered to each recipient directly. No caption or message write-up will be attached.
                        </div>
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
                        disabled={sending || recipients.length === 0}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer ${
                            sending || recipients.length === 0
                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                                : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white shadow-emerald-600/20'
                        }`}
                    >
                        {sending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Sending PDF...</span>
                            </>
                        ) : (
                            <>
                                <WhatsAppLogo className="w-4 h-4 text-white fill-white" />
                                <span>Send PDF ({recipients.length})</span>
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}
