'use client';

import React, { useState } from 'react';
import { Menu, X, LayoutDashboard, Package, ShoppingCart, ShoppingBag, FileText, ClipboardList, CheckSquare } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { twMerge } from 'tailwind-merge';
import { useAuth } from './AuthProvider';

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, iconColor: '#4338CA' },
    { name: 'Products', href: '/products', icon: Package, iconColor: '#0E8FB8' },
    { name: 'Orders', href: '/orders', icon: ShoppingCart, iconColor: '#C42B7A' },
    { name: 'Sales Invoices', href: '/invoices', icon: FileText, iconColor: '#B88400' },
    { name: 'Purchases', href: '/purchases', icon: ShoppingBag, iconColor: '#0D9488' },
    { name: 'Production', href: '/production', icon: LayoutDashboard, iconColor: '#2563EB' },
    { name: 'Quotations', href: '/quotations', icon: ClipboardList, iconColor: '#7C3AED' },
    { name: 'Inventory', href: '/inventory', icon: ClipboardList, iconColor: '#64748B' },
    { name: 'To-Do', href: '/todos', icon: CheckSquare, iconColor: '#14804A' },
];

export function MobileHeader() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    const { user, signOut } = useAuth();

    const toggleMenu = () => setIsOpen(!isOpen);
    const closeMenu = () => setIsOpen(false);

    return (
        <>
            <header className="md:hidden sticky top-0 z-50 flex h-16 items-center justify-between border-b border-[#E6E8F0] bg-white px-4 shadow-sm">
                <div className="flex items-center gap-3">
                    <img
                        src="/logos/logo_main_user_transparent.png"
                        alt="CPack Logo"
                        className="h-8 w-auto"
                    />
                </div>
                <button
                    onClick={toggleMenu}
                    className="rounded-lg p-2 text-[#4B5068] hover:bg-[#F6F7FB] active:scale-95 transition-all hover:text-[#171A2B]"
                >
                    {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </header>

            {/* Mobile Drawer Overlay */}
            <div
                className={twMerge(
                    "fixed inset-0 z-40 bg-black/30 backdrop-blur-xs transition-opacity md:hidden",
                    isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={closeMenu}
            />

            {/* Mobile Drawer Content */}
            <aside
                className={twMerge(
                    "fixed inset-y-0 left-0 z-50 w-72 transform bg-white text-[#171A2B] border-r border-[#E6E8F0] transition-transform duration-300 ease-in-out md:hidden shadow-xl",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex h-16 items-center border-b border-[#E6E8F0] px-6">
                    <img
                        src="/logos/logo_main_user_transparent.png"
                        alt="CPack Logo"
                        className="h-9 w-auto"
                    />
                    <button onClick={closeMenu} className="ml-auto rounded-lg p-1.5 text-[#4B5068] hover:bg-[#F6F7FB] hover:text-[#171A2B]">
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
                                    'group flex items-center rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all border',
                                    isActive
                                        ? 'bg-[#EEF0FF] text-[#322A9E] border-[#4338CA]/20 shadow-sm'
                                        : 'text-[#4B5068] hover:bg-[#F6F7FB] hover:text-[#171A2B] border-transparent'
                                )}
                            >
                                <item.icon
                                    className="mr-3 h-4.5 w-4.5 flex-shrink-0 transition-transform duration-150 group-hover:scale-110"
                                    style={{ color: item.iconColor }}
                                />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </aside>
        </>
    );
}
