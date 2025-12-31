import React from 'react';
import { twMerge } from 'tailwind-merge';

interface LogoProps {
    className?: string;
    onClick?: () => void;
}

export const PdfLogo = ({ className, onClick }: LogoProps) => (
    <div
        onClick={onClick}
        className={twMerge(
            "flex items-center justify-center bg-[#F40F0F] text-white font-black text-[9px] w-8 h-4 rounded-sm shadow-sm select-none px-0.5 cursor-pointer hover:brightness-110 active:scale-95 transition-all",
            className
        )}
    >
        PDF
    </div>
);

export const CdrLogo = ({ className, onClick }: LogoProps) => (
    <div
        onClick={onClick}
        className={twMerge(
            "flex items-center justify-center bg-[#008D36] text-white font-black text-[9px] w-8 h-4 rounded-sm shadow-sm select-none px-0.5 cursor-pointer hover:brightness-110 active:scale-95 transition-all",
            className
        )}
    >
        CDR
    </div>
);
