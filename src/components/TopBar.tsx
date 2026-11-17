'use client';

import { useState, memo, useCallback, useTransition } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ShoppingCart, ClipboardList, User, LogOut, FileText, ShoppingBag, Menu, X, Tally2, CheckSquare } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { useAuth } from './AuthProvider';
import { useLayout } from './LayoutContext';

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, iconColor: '#4338CA' },
    { name: 'Products', href: '/products', icon: Package, iconColor: '#0E8FB8' },
    { name: 'Orders', href: '/orders', icon: ShoppingCart, iconColor: '#C42B7A' },
    { name: 'Sales Invoices', href: '/invoices', icon: FileText, iconColor: '#B88400' },
    { name: 'Purchases', href: '/purchases', icon: ShoppingBag, iconColor: '#0D9488' },
    { name: 'Production', href: '/production', icon: LayoutDashboard, iconColor: '#2563EB' },
    { name: 'Quotations', href: '/quotations', icon: FileText, iconColor: '#7C3AED' },
    { name: 'Inventory', href: '/inventory', icon: ClipboardList, iconColor: '#64748B' },
    { name: 'To-Do', href: '/todos', icon: CheckSquare, iconColor: '#14804A' },
];

const TopNavItem = memo(({ item, isActive, onClick }: any) => (
    <Link
        href={item.href}
        onClick={onClick}
        className={twMerge(
            'group flex items-center px-3.5 py-2 rounded-xl transition-all duration-150 gap-2 border text-[12px] font-semibold tracking-wide',
            isActive
                ? 'bg-[#EEF0FF] text-[#322A9E] border-[#4338CA]/20 shadow-sm'
                : 'text-[#4B5068] hover:bg-[#F6F7FB] hover:text-[#171A2B] border-transparent'
        )}
    >
        <item.icon
            className="h-4 w-4 transition-transform duration-150 group-hover:scale-110 flex-shrink-0"
            style={{ color: item.iconColor }}
        />
        <span className="whitespace-nowrap">{item.name}</span>
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
            <header className="h-[70px] bg-white border-b border-[#E6E8F0] sticky top-0 z-50 w-full shrink-0 shadow-sm">
                <div className="max-w-[1700px] mx-auto h-full px-6 flex items-center justify-between gap-6">
                    {/* Logo Section */}
                    <div className="flex items-center gap-4 shrink-0">
                        <img
                            src="/logos/logo_main_user_transparent.png"
                            alt="CPack Logo"
                            className="h-10 w-auto"
                        />
                        <div className="hidden lg:block border-l border-[#E6E8F0] h-7 ml-1"></div>
                    </div>

                    {/* Desktop Navigation Section */}
                    <nav className="hidden md:flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2">
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
                    <div className="flex items-center gap-2 md:gap-3 shrink-0">
                        {/* Layout Toggle */}
                        <button
                            onClick={toggleNavStyle}
                            className="p-2 rounded-xl text-[#4B5068] hover:bg-[#F6F7FB] hover:text-[#4338CA] transition-all border border-[#E6E8F0] shadow-sm"
                            title="Switch to Sidebar Layout"
                        >
                            <Tally2 className="h-4.5 w-4.5 rotate-90 md:rotate-0" />
                        </button>

                        <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#F6F7FB] border border-[#E6E8F0]">
                            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#6D5EF0] to-[#C42B7A] flex items-center justify-center shadow-sm">
                                <User className="h-3.5 w-3.5 text-white" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-[#171A2B] uppercase leading-none">
                                    {user?.email?.split('@')[0] || 'Admin'}
                                </span>
                                <span className="text-[8px] text-[#8A8FA6] uppercase tracking-widest mt-0.5 font-semibold">Authorized</span>
                            </div>
                        </div>

                        <button
                            onClick={() => signOut()}
                            className="hidden md:flex p-2 rounded-xl text-[#4B5068] hover:bg-[#FCE8EA] hover:text-[#BE2D3A] transition-all border border-[#E6E8F0] hover:border-[#BE2D3A]/20"
                            title="Sign Out"
                        >
                            <LogOut className="h-4.5 w-4.5 text-[#BE2D3A]" />
                        </button>

                        {/* Mobile Menu Toggle */}
                        <button
                            onClick={toggleMenu}
                            className="md:hidden p-2 rounded-xl text-[#4B5068] hover:bg-[#F6F7FB] transition-all border border-[#E6E8F0]"
                        >
                            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Sidebar/Drawer Overlay */}
            <div
                className={twMerge(
                    "fixed inset-0 z-[60] bg-black/30 backdrop-blur-xs transition-opacity md:hidden",
                    isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={closeMenu}
            />

            {/* Mobile Drawer Content */}
            <aside
                className={twMerge(
                    "fixed inset-y-0 left-0 z-[70] w-72 transform bg-white text-[#171A2B] shadow-2xl transition-transform duration-300 ease-in-out md:hidden border-r border-[#E6E8F0]",
                    isMenuOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex h-[70px] items-center border-b border-[#E6E8F0] px-6">
                    <img
                        src="/logos/logo_main_user_transparent.png"
                        alt="CPack Logo"
                        className="h-9 w-auto"
                    />
                    <button onClick={closeMenu} className="ml-auto rounded-xl p-2 text-[#4B5068] hover:bg-[#F6F7FB] hover:text-[#171A2B]">
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

                <div className="absolute bottom-6 left-0 right-0 px-4">
                    <div className="flex items-center gap-3 rounded-2xl bg-[#F6F7FB] p-3 border border-[#E6E8F0] mb-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#6D5EF0] to-[#C42B7A] flex items-center justify-center shadow-sm">
                            <User className="h-4.5 w-4.5 text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-[#171A2B] uppercase tracking-tight">
                                {user?.email?.split('@')[0] || 'Admin'}
                            </p>
                            <p className="text-[8px] text-[#8A8FA6] uppercase tracking-widest mt-0.5 font-semibold">Authorized</p>
                        </div>
                    </div>
                    <button
                        onClick={() => signOut()}
                        className="flex items-center gap-3 w-full p-2.5 rounded-xl text-[#4B5068] hover:bg-[#FCE8EA] hover:text-[#BE2D3A] transition-all border border-transparent hover:border-[#BE2D3A]/20"
                    >
                        <LogOut className="h-4.5 w-4.5 text-[#BE2D3A]" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Sign Out</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
