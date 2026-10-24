'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function DispatchDocumentsRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/invoices');
    }, [router]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white gap-3">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            <p className="text-sm font-semibold text-slate-300">Redirecting to Sales Invoices...</p>
        </div>
    );
}
