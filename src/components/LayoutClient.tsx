'use client';

import { usePathname } from 'next/navigation';
import AppLayout from './AppLayout';

export default function LayoutClient({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isCoaPage = pathname?.includes('/coa');

    if (isCoaPage) {
        return <>{children}</>;
    }

    return <AppLayout>{children}</AppLayout>;
}
