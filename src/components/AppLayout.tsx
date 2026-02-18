import { useState, useTransition } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
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
            "flex h-screen bg-slate-50 overflow-hidden",
            navStyle === 'topbar' ? "flex-col" : "flex-row"
        )}>
            {navStyle === 'sidebar' ? (
                <Sidebar isCollapsed={isCollapsed} setIsCollapsed={toggleSidebar} />
            ) : (
                <TopBar />
            )}

            <div className={twMerge(
                "flex flex-col flex-1 overflow-hidden transition-all duration-300",
                isPending && "opacity-80"
            )}>
                <main className="flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
