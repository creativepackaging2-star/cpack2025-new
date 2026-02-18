'use client';

import { useState, memo, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ShoppingCart, ClipboardList, User, LogOut, FileText, Menu, X, Tally2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { useAuth } from './AuthProvider';
import { useLayout } from './LayoutContext';

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Products', href: '/products', icon: Package },
    { name: 'Orders', href: '/orders', icon: ShoppingCart },
    { name: 'Production', href: '/orders/offline', icon: LayoutDashboard },
    { name: 'Quotations', href: '/quotations', icon: FileText },
    { name: 'Inventory', href: '/inventory', icon: ClipboardList },
];

const TopNavItem = memo(({ item, isActive, onClick }: any) => (
    <Link
        href={item.href}
        onClick={onClick}
        className={twMerge(
            'group flex items-center px-4 py-2 rounded-xl transition-all duration-200 gap-2',
            isActive
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
        )}
    >
        <item.icon
            className={twMerge(
                'h-4 w-4 transition-transform duration-200 group-hover:scale-110',
                isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
            )}
        />
        <span className="text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">{item.name}</span>
    </Link>
));
TopNavItem.displayName = 'TopNavItem';

export function TopBar() {
    const pathname = usePathname();
    const { user, signOut } = useAuth();
    const { toggleNavStyle } = useLayout();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const toggleMenu = useCallback(() => {
        startTransition(() => {
            setIsMenuOpen(prev => !prev);
        });
    }, []);

    const closeMenu = useCallback(() => {
        startTransition(() => {
            setIsMenuOpen(false);
        });
    }, []);

    return (
        <>
            <header className="h-[70px] bg-slate-900 border-b border-slate-800 sticky top-0 z-50 w-full shrink-0">
                <div className="max-w-[1600px] mx-auto h-full px-6 flex items-center justify-between gap-8">
                    {/* Logo Section */}
                    <div className="flex items-center gap-4 shrink-0">
                        <img
                            src="/logos/logo_main_user_transparent.png"
                            alt="CPack Logo"
                            className="h-10 w-auto"
                            style={{ filter: 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.5))' }}
                        />
                        <div className="hidden lg:block border-l border-slate-800 h-8 ml-2"></div>
                    </div>

                    {/* Desktop Navigation Section */}
                    <nav className="hidden md:flex items-center gap-1 overflow-x-auto no-scrollbar py-2">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href || (
                                item.href !== '/' &&
                                pathname.startsWith(item.href + '/')
                            );

                            return (
                                <TopNavItem
                                    key={item.name}
                                    item={item}
                                    isActive={isActive}
                                />
                            );
                        })}
                    </nav>

                    {/* Right Section */}
                    <div className="flex items-center gap-2 md:gap-4 shrink-0 text-white">
                        {/* Layout Toggle */}
                        <button
                            onClick={toggleNavStyle}
                            className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-indigo-400 transition-all border border-transparent hover:border-slate-700"
                            title="Switch to Sidebar Layout"
                        >
                            <Tally2 className="h-5 w-5 rotate-90 md:rotate-0" />
                        </button>

                        <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50">
                            <div className="h-7 w-7 rounded-full bg-indigo-600 flex items-center justify-center shadow-sm">
                                <User className="h-3.5 w-3.5 text-white" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-200 uppercase leading-none">
                                    {user?.email?.split('@')[0] || 'Admin'}
                                </span>
                                <span className="text-[7px] text-slate-500 uppercase tracking-widest mt-0.5">Authorized</span>
                            </div>
                        </div>

                        <button
                            onClick={() => signOut()}
                            className="hidden md:flex p-2.5 rounded-xl text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-all border border-transparent hover:border-rose-500/20"
                            title="Sign Out"
                        >
                            <LogOut className="h-5 w-5" />
                        </button>

                        {/* Mobile Menu Toggle */}
                        <button
                            onClick={toggleMenu}
                            className="md:hidden p-2 rounded-xl text-slate-400 hover:bg-slate-800 transition-all hover:text-white"
                        >
                            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Sidebar/Drawer Overlay */}
            <div
                className={twMerge(
                    "fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm transition-opacity md:hidden",
                    isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={closeMenu}
            />

            {/* Mobile Drawer Content */}
            <aside
                className={twMerge(
                    "fixed inset-y-0 left-0 z-[70] w-72 transform bg-slate-900 shadow-2xl transition-transform duration-300 ease-in-out md:hidden",
                    isMenuOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex h-[70px] items-center border-b border-slate-800 px-6">
                    <img
                        src="/logos/logo_main_user_transparent.png"
                        alt="CPack Logo"
                        className="h-10 w-auto"
                        style={{ filter: 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.5))' }}
                    />
                    <button onClick={closeMenu} className="ml-auto rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <nav className="mt-4 px-3 space-y-1">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <TopNavItem
                                key={item.name}
                                item={item}
                                isActive={isActive}
                                onClick={closeMenu}
                            />
                        );
                    })}
                </nav>

                <div className="absolute bottom-6 left-0 right-0 px-6">
                    <div className="flex items-center gap-3 rounded-2xl bg-slate-800/50 p-4 border border-slate-700/50 mb-4">
                        <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <User className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-200 uppercase tracking-tight">
                                {user?.email?.split('@')[0] || 'Admin'}
                            </p>
                            <p className="text-[8px] text-slate-500 uppercase tracking-widest mt-0.5 font-medium">System Authorized</p>
                        </div>
                    </div>
                    <button
                        onClick={() => signOut()}
                        className="flex items-center gap-3 w-full p-4 rounded-2xl text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-all border border-transparent hover:border-rose-500/20"
                    >
                        <LogOut className="h-5 w-5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Sign Out</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
