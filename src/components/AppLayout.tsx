'use client';

import { useState, useTransition } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { MobileHeader } from '@/components/MobileHeader';
import { twMerge } from 'tailwind-merge';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isPending, startTransition] = useTransition();

    const toggleSidebar = (val: boolean) => {
        startTransition(() => {
            setIsCollapsed(val);
        });
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar isCollapsed={isCollapsed} setIsCollapsed={toggleSidebar} />
            <div className={twMerge(
                "flex flex-col flex-1 overflow-hidden transition-all duration-300",
                isPending && "opacity-80" // Subtle hint during transition
            )}>
                <MobileHeader />
                <main className="flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
