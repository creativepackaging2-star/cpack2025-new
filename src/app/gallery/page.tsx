'use client';

import React from 'react';

const refLogos = [
    '/logos/logo_ref_1.png',
    '/logos/logo_ref_2.png',
    '/logos/logo_ref_3.png',
    '/logos/logo_ref_4.png',
    '/logos/logo_ref_5.png',
    '/logos/logo_ref_6.png',
    '/logos/logo_ref_7.png',
    '/logos/logo_ref_8.png',
    '/logos/logo_ref_9.png',
];

const logos = [
    '/logos/logo_icon_21.svg',
    '/logos/logo_icon_22.svg',
    '/logos/logo_icon_23.svg',
    '/logos/logo_icon_24.svg',
    '/logos/logo_icon_25.svg',
    '/logos/logo_icon_26.svg',
];

export default function GalleryPage() {
    return (
        <div className="min-h-screen bg-slate-50 p-10">
            <header className="mb-12 text-center">
                <div className="inline-block px-4 py-1.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-[0.2em] rounded-full mb-4">
                    Reference Collection
                </div>
                <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight uppercase">Modern Vector Options</h1>
                <p className="text-slate-500 max-w-2xl mx-auto font-medium mb-12">
                    5 New High-Fidelity SVGs (Options 27-31). "Modern Coloured" abstract designs WITH "CP" initials integrated.
                    Perfectly crisp, no background issues.
                </p>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3 gap-8 mb-20">
                {refLogos.map((logo, index) => (
                    <div
                        key={`ref-${index}`}
                        className="group relative bg-white rounded-3xl p-8 shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-200 flex flex-col items-center justify-center aspect-square"
                    >
                        <div className="absolute top-4 right-6 text-slate-400 font-black text-xl group-hover:text-amber-500 transition-colors">
                            REF {index + 1}
                        </div>
                        <img
                            src={logo}
                            alt={`Reference Option ${index + 1}`}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 rounded-lg"
                        />
                        <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <button
                                onClick={() => {
                                    alert(`You selected Reference ${index + 1}. I will vectorize this for you.`);
                                }}
                                className="px-4 py-2 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/30"
                            >
                                Select Ref {index + 1}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <header className="mb-12 text-center border-t border-slate-200 pt-12">
                <h2 className="text-2xl font-black text-slate-400 mb-4 tracking-tight uppercase">Vector Recreations & Options</h2>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                {logos.map((logo, index) => (
                    <div
                        key={index}
                        className="group relative bg-white rounded-3xl p-8 shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-200 flex flex-col items-center justify-center aspect-square"
                    >
                        <div className="absolute top-4 right-6 text-slate-200 font-black text-xl group-hover:text-indigo-100 transition-colors">
                            {index + 1}
                        </div>
                        <img
                            src={logo}
                            alt={`Logo Option ${index + 1}`}
                            className="w-32 h-32 object-contain group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="mt-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300 scale-95 group-hover:scale-100">
                            <button
                                onClick={() => {
                                    alert(`To use this logo, update Sidebar.tsx to use ${logo}`);
                                }}
                                className="px-4 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-indigo-600 transition-colors"
                            >
                                Option {index + 1}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
