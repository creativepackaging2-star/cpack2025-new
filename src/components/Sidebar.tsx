'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ShoppingCart, Settings, Menu } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Products', href: '/products', icon: Package },
    { name: 'Orders', href: '/orders', icon: ShoppingCart },
    // { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="hidden border-r bg-slate-900 md:block md:w-64 lg:w-72 text-white h-screen sticky top-0">
            <div className="flex h-16 items-center border-b border-slate-800 px-6">
                <h1 className="text-xl font-bold tracking-tight text-white">PrintMfg</h1>
            </div>
            <div className="px-3 py-4">
                <nav className="space-y-1">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={twMerge(
                                    'group flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200',
                                    isActive
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                )}
                            >
                                <item.icon
                                    className={twMerge(
                                        'mr-3 h-5 w-5 flex-shrink-0',
                                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                                    )}
                                />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>
            <div className="absolute bottom-4 left-0 right-0 px-6">
                <div className="flex items-center gap-3 rounded-lg bg-slate-800/50 p-3">
                    <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center">
                        <span className="text-xs font-medium">U</span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-white">Admin User</p>
                        <p className="text-xs text-slate-400">admin@cpack.com</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
