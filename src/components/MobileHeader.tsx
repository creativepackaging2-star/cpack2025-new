'use client';

import React, { useState } from 'react';
import { Menu, X, LayoutDashboard, Package, ShoppingCart, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { twMerge } from 'tailwind-merge';
import { useAuth } from './AuthProvider';

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Products', href: '/products', icon: Package },
    { name: 'Orders', href: '/orders', icon: ShoppingCart },
    { name: 'Production', href: '/production', icon: LayoutDashboard },
    { name: 'Quotations', href: '/quotations', icon: ClipboardList },
    { name: 'Inventory', href: '/inventory', icon: ClipboardList },
];

export function MobileHeader() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    const { user } = useAuth();

    const toggleMenu = () => setIsOpen(!isOpen);
    const closeMenu = () => setIsOpen(false);

    return (
        <>
            <header className="md:hidden sticky top-0 z-50 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900 px-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <img
                        src="/logos/logo_main_user_transparent.png"
                        alt="CPack Logo"
                        className="h-8 w-auto"
                        style={{ filter: 'drop-shadow(0 0 1px rgba(255, 255, 255, 0.3))' }}
                    />
                </div>
                <button
                    onClick={toggleMenu}
                    className="rounded-md p-2 text-slate-400 hover:bg-slate-800 active:scale-95 transition-all hover:text-white"
                >
                    {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </header>

            {/* Mobile Drawer Overlay */}
            <div
                className={twMerge(
                    "fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity md:hidden",
                    isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={closeMenu}
            />

            {/* Mobile Drawer Content */}
            <aside
                className={twMerge(
                    "fixed inset-y-0 left-0 z-50 w-72 transform bg-slate-900 text-white transition-transform duration-300 ease-in-out md:hidden",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex h-16 items-center border-b border-slate-800 px-6">
                    <img
                        src="/logos/logo_main_user_transparent.png"
                        alt="CPack Logo"
                        className="h-10 w-auto"
                        style={{ filter: 'drop-shadow(0 0 1px rgba(255, 255, 255, 0.3))' }}
                    />
                    <button onClick={closeMenu} className="ml-auto rounded-md p-1 text-slate-400 hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <nav className="mt-4 px-3 space-y-1">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={closeMenu}
                                className={twMerge(
                                    'group flex items-center rounded-md px-3 py-3 text-sm font-medium transition-all',
                                    isActive
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
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

                <div className="absolute bottom-4 left-0 right-0 px-6">
                    <div className="flex items-center gap-3 rounded-lg bg-slate-800/50 p-3">
                        <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center">
                            <span className="text-xs font-medium">U</span>
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold text-slate-200 uppercase tracking-tight">
                                {user?.email?.split('@')[0] || 'Admin User'}
                            </p>
                            <p className="text-[8px] text-slate-500 font-normal uppercase tracking-widest">Authorized</p>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
