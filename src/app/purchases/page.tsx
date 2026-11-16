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
            <div className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0 shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-inner">
                        <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-base font-black text-slate-900 tracking-tight">Purchases Portal</h1>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <ShieldCheck className="w-3 h-3" />
                                Zoho InvoiceSync AI
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            Manage purchase bills, vendor reconciliation, and Zoho invoice matching
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleRefresh}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                        title="Reload Portal"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Reload</span>
                    </button>

                    <a
                        href={PURCHASES_PORTAL_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
                    >
                        <span>Open in New Tab</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                </div>
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
