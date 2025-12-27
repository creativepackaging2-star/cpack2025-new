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
            <div className="space-y-5">
                <div className="border-b border-slate-200 pb-3 flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Customer</span>
                    <span className="text-lg font-bold text-slate-900 leading-tight">{order.customer_name || '<<[Customer]>>'}</span>
                </div>

                <div className="border-b border-slate-200 pb-3 flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Product Name</span>
                    <span className="text-lg font-bold text-slate-900 leading-tight">{order.product_name || '<<[Product Name]>>'}</span>
                </div>

                <div className="grid grid-cols-2 gap-8">
                    <div className="border-b border-slate-200 pb-3 flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Artwork Code</span>
                        <span className="text-base font-bold text-slate-900">{order.artwork_code || '<<[artwork code]>>'}</span>
                    </div>
                    <div className="border-b border-slate-200 pb-3 flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Dimension</span>
                        <span className="text-base font-bold text-slate-900">{order.dimension || '<<[Dimention]>>'}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                    <div className="border-b border-slate-200 pb-3 flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">GSM</span>
                        <span className="text-base font-bold text-slate-900">{order.gsm_value || '<<[GSM]>>'}</span>
                    </div>
                    <div className="border-b border-slate-200 pb-3 flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Construction</span>
                        <span className="text-base font-bold text-slate-900">{order.construction || '<<[constraction]>>'}</span>
                    </div>
                </div>

                <div className="pb-2 flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Configuration / Specifications</span>
                    <span className="text-sm font-medium text-slate-700 leading-relaxed italic">{order.specification || order.specs || '<<[Specification]>>'}</span>
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
