'use client';

import React from 'react';
import { Order } from '../types';

interface ShadeCardTemplateProps {
    order: Order;
}

const ShadeCardTemplate: React.FC<ShadeCardTemplateProps> = ({ order }) => {
    // Single card component
    const ShadeCard = () => (
        <div className="border border-slate-300 p-10 flex flex-col justify-center" style={{ height: '33.33%' }}>
            <div className="space-y-4">
                <div className="border-b border-slate-200 pb-2">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Customer</div>
                    <div className="text-base font-bold text-slate-900">{order.customer_name || '<<[Customer]>>'}</div>
                </div>

                <div className="border-b border-slate-200 pb-2">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Product Name</div>
                    <div className="text-base font-bold text-slate-900">{order.product_name || '<<[Product Name]>>'}</div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                    <div className="border-b border-slate-200 pb-2">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Artwork Code</div>
                        <div className="text-base font-bold text-slate-900">{order.artwork_code || '<<[artwork code]>>'}</div>
                    </div>
                    <div className="border-b border-slate-200 pb-2">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Dimension</div>
                        <div className="text-base font-bold text-slate-900">{order.dimension || '<<[Dimention]>>'}</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                    <div className="border-b border-slate-200 pb-2">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">GSM</div>
                        <div className="text-base font-bold text-slate-900">{order.gsm_value || '<<[GSM]>>'}</div>
                    </div>
                    <div className="border-b border-slate-200 pb-2">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Construction</div>
                        <div className="text-base font-bold text-slate-900">{order.construction_type || order.construction || order.pasting_type || '<<[constraction]>>'}</div>
                    </div>
                </div>

                <div className="pb-2">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Specification</div>
                    <div className="text-sm font-medium text-slate-800 leading-relaxed italic">{order.specification || order.specs || '<<[Specification]>>'}</div>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 0mm;
                    }
                    body {
                        visibility: hidden;
                        background: white;
                    }
                    .shade-card-container {
                        visibility: visible;
                        position: fixed;
                        top: 0;
                        left: 0;
                        z-index: 9999;
                        width: 210mm !important;
                        height: 297mm !important;
                        margin: 0 !important;
                        padding: 10mm !important;
                        background: white;
                        box-shadow: none !important;
                    }
                    .shade-card-container * {
                        visibility: visible;
                    }
                }
            `}} />

            <div className="shade-card-container bg-white p-8 text-black font-sans" style={{ width: '210mm', height: '297mm', margin: '0 auto', border: '2px solid #000' }}>
                {/* 3-Up Layout - Three identical shade cards */}
                <div className="h-full flex flex-col">
                    <ShadeCard />
                    <ShadeCard />
                    <ShadeCard />
                </div>
            </div>
        </>
    );
};

export default ShadeCardTemplate;
