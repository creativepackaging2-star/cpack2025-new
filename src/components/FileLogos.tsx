import React, { memo } from 'react';
import { twMerge } from 'tailwind-merge';

interface LogoProps {
    className?: string;
    onClick?: () => void;
}

export const PdfLogo = memo(({ className, onClick }: LogoProps) => (
    <img
        src="/icons/pdf.png"
        alt="PDF"
        onClick={onClick}
        loading="lazy"
        decoding="async"
        width={32}
        height={32}
        className={twMerge(
            "w-8 h-8 select-none object-contain transition-transform will-change-transform",
            onClick ? "cursor-pointer hover:scale-110 active:scale-95" : "pointer-events-none",
            className
        )}
    />
));
PdfLogo.displayName = 'PdfLogo';

export const CdrLogo = memo(({ className, onClick }: LogoProps) => (
    <img
        src="/icons/corel.png"
        alt="Corel"
        onClick={onClick}
        loading="lazy"
        decoding="async"
        width={32}
        height={32}
        className={twMerge(
            "w-8 h-8 select-none object-contain transition-transform will-change-transform",
            onClick ? "cursor-pointer hover:scale-110 active:scale-95" : "pointer-events-none",
            className
        )}
    />
));
CdrLogo.displayName = 'CdrLogo';

export const WhatsAppLogo = memo(({ className, onClick }: LogoProps) => (
    <img
        src="/icons/wa1.png"
        alt="WhatsApp"
        onClick={onClick}
        loading="lazy"
        decoding="async"
        width={32}
        height={32}
        className={twMerge(
            "w-8 h-8 select-none object-contain transition-transform will-change-transform",
            onClick ? "cursor-pointer hover:scale-110 active:scale-95" : "pointer-events-none",
            className
        )}
    />
));
WhatsAppLogo.displayName = 'WhatsAppLogo';

export const PaperwalaWhatsAppLogo = memo(({ className, onClick }: LogoProps) => (
    <img
        src="/icons/ws2.png"
        alt="Paperwala WhatsApp"
        onClick={onClick}
        loading="lazy"
        decoding="async"
        width={32}
        height={32}
        className={twMerge(
            "w-8 h-8 select-none object-contain transition-transform will-change-transform",
            onClick ? "cursor-pointer hover:scale-110 active:scale-95" : "pointer-events-none",
            className
        )}
    />
));
PaperwalaWhatsAppLogo.displayName = 'PaperwalaWhatsAppLogo';


