'use client';

import { usePathname } from 'next/navigation';
import AppLayout from './AppLayout';
import { useAuth } from './AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';

import { LayoutProvider } from './LayoutContext';

export default function LayoutClient({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    const isCoaPage = pathname?.includes('/coa');
    const isLoginPage = pathname === '/login';

    useEffect(() => {
        if (!loading && !user && !isLoginPage && !isCoaPage) {
            router.push('/login');
        }
    }, [user, loading, isLoginPage, isCoaPage, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
                <div className="relative">
                    <div className="absolute inset-0 bg-indigo-600 rounded-2xl blur-xl opacity-20 animate-pulse"></div>
                    <div className="relative bg-slate-900 border border-slate-800 p-8 rounded-3xl flex flex-col items-center gap-4 shadow-2xl">
                        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                        <div className="space-y-1 text-center font-montserrat">
                            <p className="text-white font-black uppercase tracking-widest text-xs">Authenticating</p>
                            <p className="text-slate-500 font-bold text-[10px] uppercase">Verifying Secured Session...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (isLoginPage || isCoaPage) {
        return <>{children}</>;
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
                <div className="relative bg-slate-900 border border-slate-800 p-8 rounded-3xl flex flex-col items-center gap-4 shadow-2xl">
                    <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                    <p className="text-white font-black uppercase tracking-widest text-xs">Redirecting to Login...</p>
                </div>
            </div>
        );
    }

    return (
        <LayoutProvider>
            <AppLayout>{children}</AppLayout>
        </LayoutProvider>
    );
}
