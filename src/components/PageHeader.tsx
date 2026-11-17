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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 py-2 px-3 sm:px-4 md:px-6 bg-white border-b border-[#E2E8F0] mb-4 -mx-4 -mt-6 sm:-mx-6 lg:-mx-8 sticky top-0 z-30 shadow-xs">
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {showBackButton && (
                    <button
                        onClick={() => router.back()}
                        className="p-1.5 hover:bg-[#F4F6F9] rounded-lg transition-colors text-[#718A9E] hover:text-[#11253E]"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                )}

                <div className="flex items-center gap-2">
                    {icon && <div className="text-[#036989]">{icon}</div>}
                    <h1 className="text-base sm:text-lg font-bold text-[#11253E] tracking-tight uppercase">
                        {title}
                    </h1>
                </div>
            </div>

            {actions && (
                <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar justify-end w-full lg:w-auto">
                    {actions}
                </div>
            )}
        </div>
    );
}
