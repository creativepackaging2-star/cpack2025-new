'use client';

import { useState } from 'react';
import OfflineOrdersPage from '../orders/offline/page';
import PrinterBoardGrid from '@/components/PrinterBoardGrid';
import { Layers, Printer } from 'lucide-react';

export default function ProductionPage() {
    const [view, setView] = useState<'stages' | 'printers'>('printers');

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            {/* View Toggle Bar */}
            <div className="bg-slate-900 px-4 py-2 flex items-center justify-center gap-4 shrink-0 border-b border-slate-800">
                <button
                    onClick={() => setView('stages')}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${view === 'stages'
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                        : 'text-slate-500 hover:text-slate-300'
                        }`}
                >
                    <Layers className="w-3.5 h-3.5" />
                    Stage View
                </button>
                <button
                    onClick={() => setView('printers')}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${view === 'printers'
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                        : 'text-slate-400 hover:text-slate-200'
                        }`}
                >
                    <Printer className="w-3.5 h-3.5" />
                    Printer View
                </button>
            </div>

            <div className="flex-1 overflow-hidden">
                {view === 'stages' ? (
                    <OfflineOrdersPage />
                ) : (
                    <PrinterBoardGrid />
                )}
            </div>
        </div>
    );
}
