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
                    <div className="text-[10px] font-bold text-gray-600">Customer</div>
                    <div className="text-sm font-semibold">{order.customer_name || '<<[Customer]>>'}</div>
                </div>

                <div className="border-b border-black pb-1">
                    <div className="text-[10px] font-bold text-gray-600">Product Name</div>
                    <div className="text-sm font-semibold">{order.product_name || '<<[Product Name]>>'}</div>
                </div>

                <div className="border-b border-black pb-1">
                    <div className="text-[10px] font-bold text-gray-600">Artwork Code</div>
                    <div className="text-sm font-semibold">{order.artwork_code || '<<[artwork code]>>'}</div>
                </div>

                <div className="border-b border-black pb-1">
                    <div className="text-[10px] font-bold text-gray-600">Dimension</div>
                    <div className="text-sm font-semibold">{order.dimension || '<<[Dimention]>>'}</div>
                </div>

                <div className="border-b border-black pb-1">
                    <div className="text-[10px] font-bold text-gray-600">GSM</div>
                    <div className="text-sm font-semibold">{order.gsm_value || '<<[GSM]>>'}</div>
                </div>

                <div className="border-b border-black pb-1">
                    <div className="text-[10px] font-bold text-gray-600">Specification</div>
                    <div className="text-xs font-medium leading-tight">{order.specification || order.specs || '<<[Specification]>>'}</div>
                </div>

                <div className="pb-1">
                    <div className="text-[10px] font-bold text-gray-600">Construction</div>
                    <div className="text-sm font-semibold">{order.construction || '<<[constraction]>>'}</div>
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
