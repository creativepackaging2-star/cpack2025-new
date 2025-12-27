'use client';

import React, { useState, useEffect } from 'react';
import { Order } from '../types';

interface DeliveryLabelTemplateProps {
    order: Order;
    companyType?: 'Enterprise' | 'Printers' | 'Packaging';
}

const DeliveryLabelTemplate: React.FC<DeliveryLabelTemplateProps> = ({ order, companyType }) => {
    const [todayDate, setTodayDate] = useState('');

    useEffect(() => {
        setTodayDate(new Date().toLocaleDateString('en-GB'));
    }, []);

    // Determine branding based on company type
    const company = companyType || 'Enterprise';

    const brandConfig = {
        'Enterprise': {
            name: 'CREATIVE ENTERPRISE',
            address: '14, Parshva Sadan, 228 Dr. Annie Besant Road, Worli, Mumbai 400030 INDIA',
            email: 'creativepackaging@outlook.com',
            mobile: '9146178720',
            gstn: '27AARHP2206E1Z8',
            logo: '/creative_logo.png',
            logo_width: 'w-[240px]'
        },
        'Printers': {
            name: 'CREATIVE PRINTERS',
            address: '14, Parshva Sadan, 228 Dr. Annie Besant Road, Worli, Mumbai 400030 INDIA',
            email: 'creativepackaging@outlook.com',
            mobile: '8097032001',
            gstn: '27CGTPS8217E1ZT',
            logo: '/logo_printers.png',
            logo_width: 'w-[200px]'
        },
        'Packaging': {
            name: 'CREATIVE PACKAGING',
            address: '14, Parshva Sadan, 228 Dr. Annie Besant Road, Worli, Mumbai 400030 INDIA',
            email: 'creativepackaging@outlook.com',
            mobile: '8097032001',
            gstn: '27AAIPS3624G1ZL',
            logo: '/logo_packaging.png',
            logo_width: 'w-[160px]'
        }
    };

    const branding = brandConfig[company as keyof typeof brandConfig] || brandConfig['Enterprise'];

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                        size: 6in 4in landscape;
                        margin: 0mm;
                    }
                    body {
                        visibility: hidden;
                        background: white;
                    }
                    .label-container {
                        visibility: visible;
                        position: fixed;
                        top: 0;
                        left: 0;
                        z-index: 9999;
                        width: 6in !important;
                        height: 4in !important;
                        margin: 0 !important;
                        padding: 0.25in !important;
                        background: white;
                        box-shadow: none !important;
                    }
                    .label-container * {
                        visibility: visible;
                    }
                }
            `}} />

            <div className="label-container bg-white p-4 text-black font-sans" style={{ width: '6in', height: '4in', margin: '0 auto', display: 'flex', flexDirection: 'column', border: '2px solid #000' }}>
                {/* Main Content - Horizontal Layout */}
                <div className="flex gap-3 mb-3" style={{ flex: 1 }}>
                    {/* Left: Delivery Address Section */}
                    <div className="border-2 border-black p-3" style={{ flex: '1.5' }}>
                        <div className="text-xs font-bold text-gray-600 mb-2">DELIVERY ADDRESS:</div>
                        <div className="text-base font-bold leading-relaxed whitespace-pre-wrap">
                            {order.delivery_address || '<<[Delivery Address]>>'}
                        </div>
                    </div>

                    {/* Right: Product Details Table */}
                    <div className="border-2 border-black" style={{ flex: '1' }}>
                        <table className="w-full text-sm h-full">
                            <tbody>
                                <tr className="border-b border-black">
                                    <td className="font-bold p-2 bg-gray-100 border-r border-black" style={{ width: '40%' }}>Product:</td>
                                    <td className="p-2 font-semibold text-xs">{order.product_name || '<<[Product Name]>>'}</td>
                                </tr>
                                <tr className="border-b border-black">
                                    <td className="font-bold p-2 bg-gray-100 border-r border-black">Quantity:</td>
                                    <td className="p-2 font-semibold">{(order.quantity || 0).toLocaleString() || '<<[Qty Delivered]>>'}</td>
                                </tr>
                                <tr>
                                    <td className="font-bold p-2 bg-gray-100 border-r border-black">Invoice No.:</td>
                                    <td className="p-2 font-semibold">{order.inv_no || '<<[Inv No]>>'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Company Branding Footer */}
                <div className="border-t-2 border-black pt-2">
                    <div className="text-center">
                        <div className="font-bold text-sm mb-1">{branding.name}</div>
                        <div className="text-[10px] mb-0.5">{branding.address}</div>
                        <div className="text-[10px] font-semibold">
                            M: {branding.mobile} | {branding.email}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default DeliveryLabelTemplate;
