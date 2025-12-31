import React from 'react';
import { twMerge } from 'tailwind-merge';

interface LogoProps {
    className?: string;
    onClick?: () => void;
}

export const PdfLogo = ({ className, onClick }: LogoProps) => (
    <svg
        onClick={onClick}
        className={twMerge("w-8 h-8 cursor-pointer hover:scale-110 transition-transform select-none", className)}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        {/* PDF Badge */}
        <rect x="2" y="4" width="28" height="10" rx="1" fill="#E53935" />
        <text x="16" y="12" textAnchor="middle" fill="white" fontSize="7" fontWeight="900" fontFamily="sans-serif">PDF</text>
        {/* Adobe Symbol approximation */}
        <path d="M16 16C12.5 16 10 18.5 10 22C10 25.5 12.5 28 16 28C19.5 28 22 25.5 22 22C22 18.5 19.5 16 16 16ZM16 26.5C13.5 26.5 11.5 24.5 11.5 22C11.5 19.5 13.5 17.5 16 17.5C18.5 17.5 20.5 19.5 20.5 22C20.5 24.5 18.5 26.5 16 26.5Z" fill="#E53935" />
        <path d="M16 19.5C14.5 19.5 13.5 19.5 12.5 21C12.5 22.5 13.5 24 16 24C18.5 24 19.5 22.5 19.5 21C19.5 19.5 18.5 19.5 16 19.5Z" fill="#E53935" />
    </svg>
);

export const CdrLogo = ({ className, onClick }: LogoProps) => (
    <svg
        onClick={onClick}
        className={twMerge("w-8 h-8 cursor-pointer hover:scale-110 transition-transform select-none", className)}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <circle cx="16" cy="16" r="14" stroke="#8DC63F" strokeWidth="2.5" />
        <circle cx="16" cy="16" r="11.5" fill="black" />
        {/* Pencil Tip approximation */}
        <path d="M10 22L14 10L22 18L10 22Z" fill="white" />
        <path d="M22 18L24 20L20 24L18 22L22 18Z" fill="white" />
        <rect x="23" y="23" width="2" height="2" rx="0.5" fill="white" transform="rotate(45 23 23)" />
    </svg>
);
