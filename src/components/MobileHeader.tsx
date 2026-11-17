'use client';

import React, { useState } from 'react';
import { Menu, X, LayoutDashboard, Package, ShoppingCart, ShoppingBag, FileText, ClipboardList, CheckSquare } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { twMerge } from 'tailwind-merge';
import { useAuth } from './AuthProvider';

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, iconColor: '#11395D' },
    { name: 'Products', href: '/products', icon: Package, iconColor: '#036989' },
    { name: 'Orders', href: '/orders', icon: ShoppingCart, iconColor: '#5999AF' },
    { name: 'Sales Invoices', href: '/invoices', icon: FileText, iconColor: '#FD9B6C' },
    { name: 'Purchases', href: '/purchases', icon: ShoppingBag, iconColor: '#036989' },
    { name: 'Production', href: '/production', icon: LayoutDashboard, iconColor: '#11395D' },
    { name: 'Quotations', href: '/quotations', icon: ClipboardList, iconColor: '#DA3D27' },
    { name: 'Inventory', href: '/inventory', icon: ClipboardList, iconColor: '#718A9E' },
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
            <header className="md:hidden sticky top-0 z-50 flex h-16 items-center justify-between border-b border-[#E2E8F0] bg-white px-4 shadow-xs">
                <div className="flex items-center gap-3">
                    <img
                        src="/logos/logo_main_user_transparent.png"
                        alt="CPack Logo"
                        className="h-8 w-auto"
                    />
                </div>
                <button
                    onClick={toggleMenu}
                    className="rounded-lg p-2 text-[#3B556E] hover:bg-[#F4F6F9] active:scale-95 transition-all hover:text-[#11253E]"
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
                    "fixed inset-y-0 left-0 z-50 w-72 transform bg-white text-[#11253E] border-r border-[#E2E8F0] transition-transform duration-300 ease-in-out md:hidden shadow-xl",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex h-16 items-center border-b border-[#E2E8F0] px-6">
                    <img
                        src="/logos/logo_main_user_transparent.png"
                        alt="CPack Logo"
                        className="h-9 w-auto"
                    />
                    <button onClick={closeMenu} className="ml-auto rounded-lg p-1.5 text-[#3B556E] hover:bg-[#F4F6F9] hover:text-[#11253E]">
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
                                        ? 'bg-[#E6F2F7] text-[#024B62] border-[#036989]/20 shadow-xs'
                                        : 'text-[#3B556E] hover:bg-[#F4F6F9] hover:text-[#11253E] border-transparent'
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
