'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PageHeaderProps {
    title: string;
    icon?: React.ReactNode;
    showBackButton?: boolean;
    actions?: React.ReactNode;
}

export default function PageHeader({ title, icon, showBackButton = false, actions }: PageHeaderProps) {
    const router = useRouter();

    return (
        <div className="flex items-center justify-between py-4 px-6 bg-white border-b border-slate-200 mb-6 -mx-4 -mt-6 sm:-mx-6 lg:-mx-8">
            <div className="flex items-center gap-4">
                {showBackButton && (
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-900"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                )}

                <div className="flex items-center gap-3">
                    {icon && <div className="text-indigo-600">{icon}</div>}
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight uppercase">
                        {title}
                    </h1>
                </div>
            </div>

            {actions && (
                <div className="flex items-center gap-3">
                    {actions}
                </div>
            )}
        </div>
    );
}
