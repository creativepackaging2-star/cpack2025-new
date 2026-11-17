'use client';

import React, { useState } from 'react';
import { RefreshCw, ShoppingBag, ShieldCheck, ArrowUpRight } from 'lucide-react';

const PURCHASES_PORTAL_URL = 'https://zohoinvoicesync.vercel.app/';

export default function PurchasesPage() {
    const [iframeKey, setIframeKey] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const handleRefresh = () => {
        setIsLoading(true);
        setIframeKey(prev => prev + 1);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-90px)] -m-4 sm:-m-6 lg:-m-8">
            {/* Header bar */}
            <div className="bg-white border-b border-[#E6E8F0] px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between shrink-0 shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#EEF0FF] border border-[#4338CA]/15 flex items-center justify-center text-[#4338CA] shadow-xs">
                        <ShoppingBag className="w-5 h-5 text-[#0D9488]" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm sm:text-base font-bold text-[#171A2B] tracking-tight">Purchases Portal</h1>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E3F5EB] text-[#14804A] border border-[#14804A]/20">
                                <ShieldCheck className="w-3 h-3" />
                                Zoho InvoiceSync AI
                            </span>
                        </div>
                        <p className="text-[11px] text-[#8A8FA6] mt-0.5 font-medium">
                            Manage purchase bills, vendor reconciliation, and Zoho invoice matching
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleRefresh}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F6F7FB] hover:bg-[#F0F1F6] text-[#4B5068] text-xs font-semibold rounded-xl transition-all cursor-pointer border border-[#E6E8F0]"
                        title="Reload Portal"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Reload</span>
                    </button>

                    <a
                        href={PURCHASES_PORTAL_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#4338CA] hover:bg-[#322A9E] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
                    >
                        <span>Open in New Tab</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                </div>
            </div>

            {/* Browser Cookie Notice Banner */}
            <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-1.5 flex items-center justify-between gap-3 text-xs text-amber-900">
                <div className="flex items-center gap-2 truncate">
                    <span className="font-bold shrink-0">💡 Login Tip:</span>
                    <span className="text-[11px] text-amber-800 truncate">
                        If login stays on password screen after <em>"Access Granted"</em>, your browser is blocking third-party session cookies in embedded frames.
                    </span>
                </div>
                <a
                    href={PURCHASES_PORTAL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 underline flex items-center gap-0.5"
                >
                    Open directly in New Tab <ArrowUpRight className="w-3 h-3" />
                </a>
            </div>

            {/* Embedded Iframe Container */}
            <div className="relative flex-1 w-full bg-slate-100 overflow-hidden">
                {isLoading && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-xs">
                        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                        <p className="text-xs font-bold text-slate-600">Connecting to Purchases Portal...</p>
                    </div>
                )}
                <iframe
                    key={iframeKey}
                    src={PURCHASES_PORTAL_URL}
                    className="w-full h-full border-0"
                    title="Purchases Portal"
                    allow="clipboard-read; clipboard-write; camera; microphone"
                    onLoad={() => setIsLoading(false)}
                />
            </div>
        </div>
    );
}
