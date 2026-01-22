'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ShoppingCart, Settings, Menu, ClipboardList, ChevronLeft, ChevronRight, User, FileText } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { memo } from 'react';

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Products', href: '/products', icon: Package },
    { name: 'Orders', href: '/orders', icon: ShoppingCart },
    { name: 'Quotations', href: '/quotations', icon: FileText },
    { name: 'Inventory', href: '/inventory', icon: ClipboardList },
];

const NavItem = memo(({ item, isActive, isCollapsed }: any) => (
    <Link
        href={item.href}
        prefetch={false}
        className={twMerge(
            'group flex items-center rounded-xl transition-all duration-200',
            isCollapsed ? 'justify-center p-3' : 'px-4 py-3',
            isActive
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
        )}
        title={isCollapsed ? item.name : ""}
    >
        <item.icon
            className={twMerge(
                'h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110',
                isCollapsed ? "" : "mr-3",
                isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
            )}
        />
        {!isCollapsed && <span className="text-sm font-semibold whitespace-nowrap will-change-transform">{item.name}</span>}
    </Link>
));
NavItem.displayName = 'NavItem';

interface SidebarProps {
    isCollapsed: boolean;
    setIsCollapsed: (val: boolean) => void;
}

export function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
    const pathname = usePathname();

    return (
        <div className={twMerge(
            "hidden border-r bg-slate-900 md:block transition-all duration-300 ease-in-out text-white h-screen sticky top-0 z-50",
            isCollapsed ? "w-20" : "w-36 lg:w-40"
        )}>
            <div className="flex h-[80px] items-center border-b border-slate-800 px-6 justify-between overflow-hidden">
                {!isCollapsed && (
                    <h1 className="flex flex-col leading-none">
                        <span className="text-[14px] font-bold text-indigo-400 uppercase tracking-widest">Print</span>
                        <span className="text-xl font-bold tracking-tight text-white mt-1">Mfg</span>
                    </h1>
                )}
                {isCollapsed && <Package className="h-6 w-6 text-indigo-500 mx-auto" />}
            </div>

            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-20 bg-indigo-600 rounded-full p-1 border-2 border-slate-900 hover:bg-indigo-500 transition-colors z-50"
            >
                {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
            </button>

            <div className="px-3 py-6">
                <nav className="space-y-2">
                    {navigation.map((item) => (
                        <NavItem
                            key={item.name}
                            item={item}
                            isActive={pathname === item.href}
                            isCollapsed={isCollapsed}
                        />
                    ))}
                </nav>
            </div>

            <div className={twMerge(
                "absolute bottom-6 left-0 right-0 px-3 transition-opacity duration-300",
                isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
            )}>
                <div className="flex items-center gap-3 rounded-2xl bg-slate-800/30 p-4 border border-slate-700/50">
                    <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-inner">
                        <User className="h-5 w-5 text-indigo-100" />
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-bold text-white truncate">Admin User</p>
                    </div>
                </div>
            </div>

            {isCollapsed && (
                <div className="absolute bottom-10 left-0 right-0 flex justify-center">
                    <div className="h-10 w-10 rounded-xl bg-slate-800/50 flex items-center justify-center border border-slate-700/50">
                        <span className="text-xs font-black text-indigo-500">CP</span>
                    </div>
                </div>
            )}
        </div>
    );
}
