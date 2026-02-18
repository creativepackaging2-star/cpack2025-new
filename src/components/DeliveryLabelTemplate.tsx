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

    const [scale, setScale] = useState(1);

    useEffect(() => {
        const handleResize = () => {
            if (typeof window !== 'undefined') {
                const width = window.innerWidth;
                const targetWidth = 6 * 96; // 6 inches
                if (width < targetWidth + 20) {
                    setScale((width - 20) / targetWidth);
                } else {
                    setScale(1);
                }
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap');
                
                @media print {
                    @page {
                        size: 5.6in 4in landscape;
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
                        width: 5.6in !important;
                        height: 4in !important;
                        margin: 0 !important;
                        padding: 0.25in !important;
                        background: white;
                        box-shadow: none !important;
                        transform: none !important;
                    }
                    .label-container * {
                        visibility: visible;
                    }
                }
                .label-container {
                    font-family: 'Montserrat', sans-serif !important;
                }
            `}} />

            <div
                className="print:p-0"
                style={{
                    width: scale < 1 ? '100vw' : 'auto',
                    height: scale < 1 ? `calc(4in * ${scale})` : 'auto',
                    overflow: 'hidden',
                    display: 'flex',
                    justifyContent: 'center'
                }}
            >
                <div
                    className="label-container bg-white p-4 text-black relative shadow-xl print:shadow-none"
                    style={{
                        width: '5.6in',
                        height: '4in',
                        transform: scale < 1 ? `scale(${scale})` : 'none',
                        transformOrigin: 'top center',
                        margin: '0 auto',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    {/* Main Content - Horizontal Layout */}
                    <div className="flex gap-3 mb-3" style={{ flex: 1 }}>
                        {/* Left: Delivery Address Section */}
                        <div className="border border-black p-3" style={{ flex: '1.5' }}>
                            <div className="text-[10px] font-medium text-gray-500 mb-2 uppercase tracking-tight">DELIVERY ADDRESS:</div>
                            <div className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
                                {order.delivery_address || '<<[Delivery Address]>>'}
                            </div>
                        </div>

                        {/* Right: Product Details - 6 Equal Rows */}
                        <div className="border border-black flex flex-col" style={{ flex: '1' }}>
                            <div className="border-b border-black flex items-center justify-center" style={{ flex: 1 }}>
                                <div className="text-[10px] font-medium text-gray-500 uppercase">Product</div>
                            </div>
                            <div className="border-b border-black flex items-center justify-center px-2" style={{ flex: 1 }}>
                                <div className="text-xs font-bold text-center leading-tight uppercase">{order.product_name || '<<[Product Name]>>'}</div>
                            </div>
                            <div className="border-b border-black flex items-center justify-center" style={{ flex: 1 }}>
                                <div className="text-[10px] font-medium text-gray-500 uppercase">Qty</div>
                            </div>
                            <div className="border-b border-black flex items-center justify-center font-bold" style={{ flex: 1 }}>
                                <div className="text-sm font-black">
                                    {/* Quantity value hidden as per request */}
                                </div>
                            </div>
                            <div className="border-b border-black flex items-center justify-center" style={{ flex: 1 }}>
                                <div className="text-[10px] font-medium text-gray-500 uppercase">Invoice No</div>
                            </div>
                            <div className="flex items-center justify-center" style={{ flex: 1 }}>
                                <div className="text-xs font-medium">{order.invoice_no || '<<[Inv No]>>'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Company Branding Footer */}
                    <div className="border-t border-black pt-2">
                        <div className="text-center">
                            <div className="font-semibold text-[11px] mb-0.5">{branding.name}</div>
                            <div className="text-[9px] font-light mb-0.5">{branding.address}</div>
                            <div className="text-[9px] font-medium">
                                M: {branding.mobile} | {branding.email}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default DeliveryLabelTemplate;
