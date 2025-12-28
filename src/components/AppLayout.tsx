import { Sidebar } from '@/components/Sidebar';
import { MobileHeader } from '@/components/MobileHeader';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
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
