'use client';

import React, { useState, useEffect } from 'react';
import { Order } from '../types';

interface ShadeCardTemplateProps {
    order: Order;
}

const ShadeCardTemplate: React.FC<ShadeCardTemplateProps> = ({ order }) => {
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const handleResize = () => {
            if (typeof window !== 'undefined') {
                const width = window.innerWidth;
                const targetWidth = 210 * 3.78; // 210mm in pixels approx
                if (width < targetWidth + 40) {
                    setScale((width - 40) / targetWidth);
                } else {
                    setScale(1);
                }
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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
                        transform: none !important;
                    }
                    .shade-card-container * {
                        visibility: visible;
                    }
                }
            `}} />

            <div
                className="print:p-0"
                style={{
                    width: scale < 1 ? '100vw' : 'auto',
                    height: scale < 1 ? `calc(297mm * ${scale})` : 'auto',
                    overflow: 'hidden',
                    display: 'flex',
                    justifyContent: 'center'
                }}
            >
                <div
                    className="shade-card-container bg-white p-8 text-black font-sans relative shadow-2xl print:shadow-none"
                    style={{
                        width: '210mm',
                        height: '297mm',
                        transform: scale < 1 ? `scale(${scale})` : 'none',
                        transformOrigin: 'top center',
                        margin: '0 auto',
                        border: '2px solid #000',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    {/* 3-Up Layout - Three identical shade cards */}
                    <div className="h-full flex flex-col">
                        <ShadeCard />
                        <ShadeCard />
                        <ShadeCard />
                    </div>
                </div>
            </div>
        </>
    );
};

export default ShadeCardTemplate;
