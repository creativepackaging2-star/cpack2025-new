import { useState, useTransition } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { MobileHeader } from '@/components/MobileHeader';
import { twMerge } from 'tailwind-merge';
import { useLayout } from './LayoutContext';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isPending, startTransition] = useTransition();
    const { navStyle } = useLayout();

    const toggleSidebar = (val: boolean) => {
        startTransition(() => {
            setIsCollapsed(val);
        });
    };

    return (
        <div className={twMerge(
            "flex h-[100dvh] bg-slate-50 overflow-hidden",
            navStyle === 'topbar' ? "flex-col" : "flex-row"
        )}>
            {/* Desktop Sidebar — hidden on mobile via its own md:block class */}
            {navStyle === 'sidebar' && (
                <Sidebar isCollapsed={isCollapsed} setIsCollapsed={toggleSidebar} />
            )}

            {/* Main column: topbar/mobile-header + content */}
            <div className={twMerge(
                "flex flex-col flex-1 overflow-hidden transition-all duration-300",
                isPending && "opacity-80"
            )}>
                {/* TopBar for topbar nav style; MobileHeader for sidebar nav style on mobile */}
                {navStyle === 'topbar' ? <TopBar /> : <MobileHeader />}

                <main className="flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
