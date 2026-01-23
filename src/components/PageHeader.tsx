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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 px-4 md:px-6 bg-white border-b border-slate-200 mb-6 -mx-4 -mt-6 sm:-mx-6 lg:-mx-8 sticky top-0 md:static z-30 shadow-sm md:shadow-none">
            <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
                {showBackButton && (
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-900"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                )}

                <div className="flex items-center gap-2 md:gap-3">
                    {icon && <div className="text-indigo-600">{icon}</div>}
                    <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight uppercase">
                        {title}
                    </h1>
                </div>
            </div>

            {actions && (
                <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                    {actions}
                </div>
            )}
        </div>
    );
}
