'use client';

import React, { createContext, useContext, useState, useEffect, useTransition } from 'react';

type NavigationStyle = 'sidebar' | 'topbar';

interface LayoutContextType {
    navStyle: NavigationStyle;
    setNavStyle: (style: NavigationStyle) => void;
    toggleNavStyle: () => void;
    isPending: boolean;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
    const [navStyle, setNavStyle] = useState<NavigationStyle>('topbar');
    const [isPending, startTransition] = useTransition();

    // Persist preference
    useEffect(() => {
        const saved = localStorage.getItem('cpack_nav_style') as NavigationStyle;
        if (saved && (saved === 'sidebar' || saved === 'topbar')) {
            setNavStyle(saved);
        }
    }, []);

    const handleSetStyle = (style: NavigationStyle) => {
        startTransition(() => {
            setNavStyle(style);
        });
        localStorage.setItem('cpack_nav_style', style);
    };

    const toggleNavStyle = () => {
        const newStyle = navStyle === 'sidebar' ? 'topbar' : 'sidebar';
        handleSetStyle(newStyle);
    };

    return (
        <LayoutContext.Provider value={{ navStyle, setNavStyle: handleSetStyle, toggleNavStyle, isPending }}>
            {children}
        </LayoutContext.Provider>
    );
}

export function useLayout() {
    const context = useContext(LayoutContext);
    if (context === undefined) {
        throw new Error('useLayout must be used within a LayoutProvider');
    }
    return context;
}
