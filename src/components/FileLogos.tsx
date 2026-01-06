import React from 'react';
import { twMerge } from 'tailwind-merge';

interface LogoProps {
    className?: string;
    onClick?: () => void;
}

export const PdfLogo = ({ className, onClick }: LogoProps) => (
    <img
        src="/icons/pdf.png"
        alt="PDF"
        onClick={onClick}
        className={twMerge("w-8 h-8 cursor-pointer hover:scale-110 transition-transform select-none object-contain", className)}
    />
);

export const CdrLogo = ({ className, onClick }: LogoProps) => (
    <img
        src="/icons/corel.png"
        alt="Corel"
        onClick={onClick}
        className={twMerge("w-8 h-8 cursor-pointer hover:scale-110 transition-transform select-none object-contain", className)}
    />
);

export const WhatsAppLogo = ({ className, onClick }: LogoProps) => (
    <img
        src="/icons/wa1.png"
        alt="WhatsApp"
        onClick={onClick}
        className={twMerge("w-8 h-8 cursor-pointer hover:scale-110 transition-transform select-none object-contain", className)}
    />
);

export const PaperwalaWhatsAppLogo = ({ className, onClick }: LogoProps) => (
    <img
        src="/icons/ws2.png"
        alt="Paperwala WhatsApp"
        onClick={onClick}
        className={twMerge("w-8 h-8 cursor-pointer hover:scale-110 transition-transform select-none object-contain", className)}
    />
);

