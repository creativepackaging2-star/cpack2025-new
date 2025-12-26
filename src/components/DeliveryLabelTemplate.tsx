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
                        size: 4in 6in;
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
                        width: 4in !important;
                        height: 6in !important;
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

            <div className="label-container bg-white p-4 text-black font-sans" style={{ width: '4in', height: '6in', margin: '0 auto', display: 'flex', flexDirection: 'column', border: '2px solid #000' }}>
                {/* Delivery Address Section - Large Box */}
                <div className="border-2 border-black p-4 mb-3" style={{ minHeight: '3in' }}>
                    <div className="text-xs font-bold text-gray-600 mb-2">DELIVERY ADDRESS:</div>
                    <div className="text-lg font-bold leading-relaxed whitespace-pre-wrap">
                        {order.delivery_address || '<<[Delivery Address]>>'}
                    </div>
                </div>

                {/* Product Details Table */}
                <div className="border-2 border-black mb-3">
                    <table className="w-full text-sm">
                        <tbody>
                            <tr className="border-b border-black">
                                <td className="font-bold p-2 bg-gray-100 border-r border-black" style={{ width: '35%' }}>Product:</td>
                                <td className="p-2 font-semibold">{order.product_name || '<<[Product Name]>>'}</td>
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

                {/* Company Branding Footer */}
                <div className="mt-auto border-t-2 border-black pt-2">
                    <div className="text-center">
                        <div className="font-bold text-base mb-1">{branding.name}</div>
                        <div className="text-xs mb-1">{branding.address}</div>
                        <div className="text-xs font-semibold">
                            M: {branding.mobile} | {branding.email}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default DeliveryLabelTemplate;
