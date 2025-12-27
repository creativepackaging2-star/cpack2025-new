'use client';

import React from 'react';
import { Order } from '../types';

interface ShadeCardTemplateProps {
    order: Order;
}

const ShadeCardTemplate: React.FC<ShadeCardTemplateProps> = ({ order }) => {
    // Single card component
    const ShadeCard = () => (
        <div className="border-2 border-black p-4" style={{ height: '33.33%' }}>
            <div className="space-y-2">
                <div className="border-b border-black pb-1">
                    <div className="text-sm"><span className="font-bold text-gray-600">Customer:</span> <span className="font-semibold">{order.customer_name || '<<[Customer]>>'}</span></div>
                </div>

                <div className="border-b border-black pb-1">
                    <div className="text-sm"><span className="font-bold text-gray-600">Product Name:</span> <span className="font-semibold">{order.product_name || '<<[Product Name]>>'}</span></div>
                </div>

                <div className="border-b border-black pb-1">
                    <div className="text-sm"><span className="font-bold text-gray-600">Artwork Code:</span> <span className="font-semibold">{order.artwork_code || '<<[artwork code]>>'}</span></div>
                </div>

                <div className="border-b border-black pb-1">
                    <div className="text-sm"><span className="font-bold text-gray-600">Dimension:</span> <span className="font-semibold">{order.dimension || '<<[Dimention]>>'}</span></div>
                </div>

                <div className="border-b border-black pb-1">
                    <div className="text-sm"><span className="font-bold text-gray-600">GSM:</span> <span className="font-semibold">{order.gsm_value || '<<[GSM]>>'}</span></div>
                </div>

                <div className="border-b border-black pb-1">
                    <div className="text-sm"><span className="font-bold text-gray-600">Specification:</span> <span className="font-medium">{order.specification || order.specs || '<<[Specification]>>'}</span></div>
                </div>

                <div className="pb-1">
                    <div className="text-sm"><span className="font-bold text-gray-600">Construction:</span> <span className="font-semibold">{order.construction || '<<[constraction]>>'}</span></div>
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
