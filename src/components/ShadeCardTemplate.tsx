'use client';

import React from 'react';
import { Order } from '../types';

interface ShadeCardTemplateProps {
    order: Order;
}

const ShadeCardTemplate: React.FC<ShadeCardTemplateProps> = ({ order }) => {
    // Single card component
    const ShadeCard = () => (
        <div className="border-t border-b border-slate-300 py-4 px-6 flex flex-col justify-center" style={{ height: '33.33%' }}>
            <div className="space-y-2">
                <div className="flex items-start">
                    <span className="w-36 font-medium text-slate-500 shrink-0">Customer:</span>
                    <span className="text-slate-900 font-semibold">{order.customer_name || '<<[Customer]>>'}</span>
                </div>

                <div className="flex items-start">
                    <span className="w-36 font-medium text-slate-500 shrink-0">Product Name :</span>
                    <span className="text-slate-900 font-bold leading-tight">{order.product_name || '<<[Product Name]>>'}</span>
                </div>

                <div className="flex items-start">
                    <span className="w-36 font-medium text-slate-500 shrink-0">Artwork Code:</span>
                    <span className="text-slate-900 font-semibold">{order.artwork_code || '<<[artwork code]>>'}</span>
                </div>

                <div className="flex items-start">
                    <span className="w-36 font-medium text-slate-500 shrink-0">Dimension:</span>
                    <span className="text-slate-900 font-semibold">{order.dimension || '<<[Dimention]>>'}</span>
                </div>

                <div className="flex items-start">
                    <span className="w-36 font-medium text-slate-500 shrink-0">GSM :</span>
                    <span className="text-slate-900 font-semibold">{order.gsm_value || '<<[GSM]>>'}</span>
                </div>

                <div className="flex items-start">
                    <span className="w-36 font-medium text-slate-500 shrink-0">Specification:</span>
                    <span className="text-slate-800 font-medium italic leading-snug flex-1">{order.specification || order.specs || '<<[Specification]>>'}</span>
                </div>

                <div className="flex items-start">
                    <span className="w-36 font-medium text-slate-500 shrink-0">Construction:</span>
                    <span className="text-slate-900 font-semibold">{order.construction_type || order.construction || order.pasting_type || '<<[constraction]>>'}</span>
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
