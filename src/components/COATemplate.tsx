'use client';

import React, { useState, useEffect } from 'react';
import { Order } from '../types';

interface COATemplateProps {
    order: Order;
}

const COATemplate: React.FC<COATemplateProps> = ({ order }) => {
    const [todayDate, setTodayDate] = useState('');

    useEffect(() => {
        setTodayDate(new Date().toLocaleDateString('en-GB'));
    }, []);

    const branding = {
        name: 'CREATIVE ENTERPRISE',
        address: '14, Parshva Sadan, 228 Dr. Annie Besant Road, Worli, Mumbai 400030 INDIA',
        email: 'creativepackaging@outlook.com',
        mobile: '9146178720',
        gstn: '27AARHP2206E1Z8',
    };

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Herr+Von+Muellerhoff&display=swap');
                
                @media print {
                    @page {
                        size: A4;
                        margin: 0mm;
                    }
                    body {
                        visibility: hidden;
                        background: white;
                    }
                    .coa-container {
                        visibility: visible;
                        position: fixed;
                        top: 0;
                        left: 0;
                        z-index: 9999;
                        width: 210mm !important;
                        height: 297mm !important;
                        margin: 0 !important;
                        padding: 15mm !important;
                        background: white;
                        box-shadow: none !important;
                    }
                    .coa-container * {
                        visibility: visible;
                    }
                }
                .font-signature {
                    font-family: 'Great Vibes', cursive;
                }
                .font-signature-alt {
                    font-family: 'Herr Von Muellerhoff', cursive;
                }
            `}} />

            <div className="coa-container bg-white p-[0.75in] text-black font-sans leading-tight print:p-0 relative" style={{ width: '210mm', minHeight: '297mm', margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div className="mb-8 border-b-2 border-slate-800 pb-4">
                    <div className="flex justify-between items-center mb-2">
                        {/* Replaced Text Logo with Image */}
                        <div className="w-[300px]">
                            <img src="/creative_logo.png" alt="Creative Enterprise" className="max-w-full h-auto object-contain" />
                        </div>
                        <div className="text-right text-[11px] font-medium text-slate-600">
                            <p>M: {branding.mobile}</p>
                            <p>GSTN: {branding.gstn}</p>
                        </div>
                    </div>
                    <div className="text-[11px] font-medium text-slate-600 mt-2">
                        <p>{branding.address}</p>
                        <p>{branding.email}</p>
                    </div>
                </div>

                {/* Title */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold uppercase tracking-wide border-b border-black inline-block pb-1">Certificate of Analysis</h1>
                </div>

                {/* Customer Section */}
                <div className="mb-6 grid grid-cols-1 gap-1 text-[13px]">
                    <div className="flex">
                        <span className="w-36 font-bold text-slate-800">Customer Name:</span>
                        <span className="font-semibold">{order.customer_name || '<<[Customer]>>'}</span>
                    </div>
                    <div className="flex items-start">
                        <span className="w-36 font-bold text-slate-800 shrink-0">Address:</span>
                        <span className="flex-1 whitespace-pre-wrap">{order.delivery_address || '<<[Delivery Address]>>'}</span>
                    </div>
                </div>

                {/* Order Details List */}
                <div className="border border-slate-300 rounded-lg p-4 mb-6 text-[13px] bg-slate-50/50">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                        <div className="flex border-b border-slate-200 pb-1">
                            <span className="w-32 font-bold text-slate-700">Date :</span>
                            <span>{todayDate || '<<[Delivery Date]>>'}</span>
                        </div>
                        <div className="flex border-b border-slate-200 pb-1">
                            <span className="w-32 font-bold text-slate-700">Date of Mfg.:</span>
                            <span>{order.order_date || '<<[Ready Date]>>'}</span>
                        </div>

                        <div className="col-span-2 flex border-b border-slate-200 pb-1">
                            <span className="w-32 font-bold text-slate-700">Product Name :</span>
                            <span className="font-bold">{order.product_name || '<<[Product Name]>>'}</span>
                        </div>

                        <div className="flex border-b border-slate-200 pb-1">
                            <span className="w-32 font-bold text-slate-700">Quantity:</span>
                            <span>{(order.quantity || 0).toLocaleString() || '<<[Qty Delivered]>>'}</span>
                        </div>
                        <div className="flex border-b border-slate-200 pb-1">
                            <span className="w-32 font-bold text-slate-700">Batch No:</span>
                            <span>{order.batch_no || '<<[Batch No]>>'}</span>
                        </div>

                        <div className="flex border-b border-slate-200 pb-1">
                            <span className="w-32 font-bold text-slate-700">Invoice No:</span>
                            <span>{order.inv_no || '<<[Inv no]>>'}</span>
                        </div>
                        <div className="flex border-b border-slate-200 pb-1">
                            <span className="w-32 font-bold text-slate-700">Artwork Code:</span>
                            <span>{order.artwork_code || '<<[artwork code]>>'}</span>
                        </div>
                    </div>
                </div>

                {/* Analysis Table */}
                <div className="mb-8">
                    <table className="w-full border-collapse border border-slate-800 text-[13px]">
                        <thead>
                            <tr className="bg-slate-100">
                                <th className="border border-slate-800 p-2 w-14 text-center font-bold">Sr No</th>
                                <th className="border border-slate-800 p-2 w-32 text-left font-bold">Test</th>
                                <th className="border border-slate-800 p-2 text-left font-bold">Specification</th>
                                <th className="border border-slate-800 p-2 w-32 text-center font-bold">Observation</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border border-slate-800 p-2 text-center">1</td>
                                <td className="border border-slate-800 p-2 font-medium">Description</td>
                                <td className="border border-slate-800 p-2">{order.specification || order.specs || '<<[Specification]>>'}</td>
                                <td className="border border-slate-800 p-2 text-center font-bold text-emerald-700">OK</td>
                            </tr>
                            <tr>
                                <td className="border border-slate-800 p-2 text-center">2</td>
                                <td className="border border-slate-800 p-2 font-medium">GSM</td>
                                <td className="border border-slate-800 p-2">{order.gsm_value ? `${order.gsm_value} +/- 5%` : '<<[gsm]>> +/- 5%'}</td>
                                <td className="border border-slate-800 p-2 text-center">
                                    <span className="font-bold text-emerald-700">OK</span>
                                    {order.gsm_value && <div className="text-[10px] text-slate-500">{order.gsm_value}</div>}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-slate-800 p-2 text-center">3</td>
                                <td className="border border-slate-800 p-2 font-medium">Construction</td>
                                <td className="border border-slate-800 p-2">
                                    {order.construction || order.construction_type || 'As per approved specimen'}
                                    {order.category_name?.toLowerCase().includes('insert') && (order.folding_dim || order.folding_dimension) && (
                                        <span> ({order.folding_dim || order.folding_dimension})</span>
                                    )}
                                </td>
                                <td className="border border-slate-800 p-2 text-center">
                                    <span className="font-bold text-emerald-700">OK</span>
                                    {order.category_name?.toLowerCase().includes('insert') && (order.folding_dim || order.folding_dimension) && (
                                        <div className="text-[10px] text-slate-500">({order.folding_dim || order.folding_dimension})</div>
                                    )}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-slate-800 p-2 text-center">4</td>
                                <td className="border border-slate-800 p-2 font-medium">Dimensions</td>
                                <td className="border border-slate-800 p-2">{order.dimension ? `${order.dimension} mm +/-2mm` : '<<[Dimension]>>mm +/-2mm'}</td>
                                <td className="border border-slate-800 p-2 text-center">
                                    <span className="font-bold text-emerald-700">OK</span>
                                    {order.dimension && <div className="text-[10px] text-slate-500">{order.dimension}</div>}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-slate-800 p-2 text-center">5</td>
                                <td className="border border-slate-800 p-2 font-medium">Shade</td>
                                <td className="border border-slate-800 p-2">Will comply with shade</td>
                                <td className="border border-slate-800 p-2 text-center font-bold text-emerald-700">OK</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Signature Section - Spacer to push to bottom but not too far if content is short */}
                <div className="mt-auto mb-4">
                    <div className="flex justify-between items-end mb-8 pt-8 border-t border-slate-200">
                        <div className="text-[13px]">
                            <p className="font-bold text-slate-700">Checked By : Laxman</p>
                            <div className="mt-1 font-signature-alt text-4xl text-blue-900 transform -rotate-3 ml-2">LS</div>
                        </div>
                        <div className="text-right text-[13px]">
                            <p className="font-bold text-slate-700">Approved By : Saahil</p>
                            <div className="mt-1 font-signature-alt text-4xl text-blue-900 transform -rotate-2 ml-auto mr-4">Sps</div>
                        </div>
                    </div>

                    <div className="text-right text-[13px]">
                        <p className="text-blue-800 font-bold uppercase tracking-wider text-sm">For {branding.name}</p>
                        <div className="mt-2 flex justify-end">
                            <div className="text-center relative">
                                {/* Signature Image */}
                                <div className="h-7 flex items-center justify-center mb-1">
                                    <img src="/pr_shah_sign_new.png" alt="P. R. Shah" className="h-full w-auto object-contain" />
                                </div>
                                <p className="text-blue-800 font-bold text-[11px] uppercase border-t border-slate-300 pt-1 inline-block px-4">Proprietor</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default COATemplate;
