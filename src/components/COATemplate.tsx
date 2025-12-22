import React from 'react';
import { Order } from '../types';

interface COATemplateProps {
    order: Order;
}

const COATemplate: React.FC<COATemplateProps> = ({ order }) => {
    // Dynamic Branding based on 'from_our_company'
    const company = order.from_our_company?.toLowerCase() || '';

    const branding = {
        name: company.includes('enter') ? 'CREATIVE ENTERPRISE' :
            company.includes('pack') ? 'CREATIVE PACKAGING' :
                company.includes('print') ? 'CREATIVE PRINTERS' : 'CREATIVE ENTERPRISE',
        email: 'creativepackaging@outlook.com',
        mobile: company.includes('enter') ? '9146178720' : '8097032001',
        gstn: company.includes('enter') ? '27AARHP2206E1Z8' :
            company.includes('pack') ? '27AAIPS3624G1ZL' :
                company.includes('print') ? '27CGTPS8217E1ZT' : '27AARHP2206E1Z8',
    };

    return (
        <div className="bg-white p-12 max-w-[800px] mx-auto text-slate-800 font-serif leading-tight print:p-0">
            {/* Header */}
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-1">
                    <span className="text-2xl tracking-tighter font-light">CREATIVE</span>
                    <span className="text-2xl font-bold">{branding.name.split(' ')[1]}</span>
                </div>
            </div>

            <div className="text-[11px] mb-6 font-sans">
                <p>14, Parshva Sadan, 228 Dr. Annie Besant Road, Worli, Mumbai 400030 INDIA</p>
                <div className="flex gap-4">
                    <span>{branding.email}</span>
                    <span>M: {branding.mobile}</span>
                    <span>GSTN: {branding.gstn}</span>
                </div>
            </div>

            <h1 className="text-xl font-bold text-center underline uppercase mb-8">Certificate of Analysis</h1>

            {/* Top Details Grid */}
            <div className="grid grid-cols-1 gap-y-1 mb-8 text-[13px]">
                <div className="flex">
                    <span className="w-32 font-bold">Customer Name:</span>
                    <span className="flex-1 font-semibold">{order.customer_name || '-'}</span>
                </div>
                <div className="flex mb-4">
                    <span className="w-32 font-bold">Address:</span>
                    <span className="flex-1">{order.delivery_address || '-'}</span>
                </div>

                <hr className="border-slate-300 mb-2" />

                <div className="flex">
                    <span className="w-32">Date:</span>
                    <span>{new Date().toLocaleDateString('en-GB')}</span>
                </div>
                <div className="flex">
                    <span className="w-32">Product Name:</span>
                    <span className="font-bold">{order.product_name || '-'}</span>
                </div>
                <div className="flex">
                    <span className="w-32">Quantity:</span>
                    <span>{(order.quantity || 0).toLocaleString()}</span>
                </div>
                <div className="flex">
                    <span className="w-32">Invoice No:</span>
                    <span>{order.inv_no || '________________'}</span>
                </div>
                <div className="flex">
                    <span className="w-32">Date of Mfg.:</span>
                    <span>{order.order_date ? new Date(order.order_date).toLocaleDateString('en-GB') : '________________'}</span>
                </div>
                <div className="flex">
                    <span className="w-32">Batch No:</span>
                    <span>{order.batch_no || '________________'}</span>
                </div>
                <div className="flex">
                    <span className="w-32">Artwork Code:</span>
                    <span className="uppercase">{order.artwork_code || '-'}</span>
                </div>
            </div>

            {/* Analysis Table */}
            <table className="w-full border-collapse border border-slate-900 text-[13px] mb-12">
                <thead>
                    <tr className="bg-slate-50 uppercase font-bold text-center">
                        <th className="border border-slate-900 p-2 w-14">Sr No</th>
                        <th className="border border-slate-900 p-2 w-32">Test</th>
                        <th className="border border-slate-900 p-2">Specification</th>
                        <th className="border border-slate-900 p-2 w-32">Observation</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="border border-slate-900 p-2 text-center">1</td>
                        <td className="border border-slate-900 p-2">Description</td>
                        <td className="border border-slate-900 p-2 font-medium">{order.specs || '-'}</td>
                        <td className="border border-slate-900 p-2 text-center font-bold">OK</td>
                    </tr>
                    <tr>
                        <td className="border border-slate-900 p-2 text-center">2</td>
                        <td className="border border-slate-900 p-2">GSM</td>
                        <td className="border border-slate-900 p-2">{order.gsm_value ? `${order.gsm_value} +/- 5%` : '-'}</td>
                        <td className="border border-slate-900 p-2 text-center font-bold">
                            OK<br /><span className="text-[10px] font-normal">{order.gsm_value}</span>
                        </td>
                    </tr>
                    <tr>
                        <td className="border border-slate-900 p-2 text-center">3</td>
                        <td className="border border-slate-900 p-2">Construction</td>
                        <td className="border border-slate-900 p-2">As per standard</td>
                        <td className="border border-slate-900 p-2 text-center font-bold">OK</td>
                    </tr>
                    <tr>
                        <td className="border border-slate-900 p-2 text-center">4</td>
                        <td className="border border-slate-900 p-2">Dimensions</td>
                        <td className="border border-slate-900 p-2">{order.dimension ? `${order.dimension} mm +/- 2mm` : '-'}</td>
                        <td className="border border-slate-900 p-2 text-center font-bold">
                            OK<br /><span className="text-[10px] font-normal">{order.dimension}</span>
                        </td>
                    </tr>
                    <tr>
                        <td className="border border-slate-900 p-2 text-center">5</td>
                        <td className="border border-slate-900 p-2">Shade</td>
                        <td className="border border-slate-900 p-2">Will comply with shade</td>
                        <td className="border border-slate-900 p-2 text-center font-bold">OK</td>
                    </tr>
                </tbody>
            </table>

            {/* Footer Signatures */}
            <div className="flex justify-between items-end text-[13px] mt-20">
                <div className="text-center">
                    <p className="mb-4 italic">Checked By: Laxman</p>
                    <div className="font-serif italic text-lg opacity-50">LS</div>
                </div>
                <div className="text-center space-y-2">
                    <p className="font-bold">Approved By Saahil</p>
                    <div className="space-y-1">
                        <p className="text-[11px] font-bold text-blue-600 uppercase">For {branding.name}</p>
                        <div className="h-10"></div>
                        <p className="italic font-bold">Proprietor</p>
                    </div>
                </div>
            </div>

            {/* Print Instruction */}
            <div className="mt-20 text-[10px] text-slate-400 text-center print:hidden">
                <p>Click Ctrl + P to print or save as PDF</p>
            </div>
        </div>
    );
};

export default COATemplate;
