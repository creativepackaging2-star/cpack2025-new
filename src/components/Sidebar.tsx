'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ShoppingCart, Settings, Menu, ClipboardList, ChevronLeft, ChevronRight, User, FileText, Tally2, CheckSquare, ShoppingBag, LogOut } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { memo, useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useAuth } from './AuthProvider';
import { useLayout } from './LayoutContext';

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, iconColor: '#11395D' },
    { name: 'Products', href: '/products', icon: Package, iconColor: '#036989' },
    { name: 'Orders', href: '/orders', icon: ShoppingCart, iconColor: '#5999AF' },
    { name: 'Sales Invoices', href: '/invoices', icon: FileText, iconColor: '#FD9B6C' },
    { name: 'Purchases', href: '/purchases', icon: ShoppingBag, iconColor: '#036989' },
    { name: 'Production', href: '/production', icon: LayoutDashboard, iconColor: '#11395D' },
    { name: 'Quotations', href: '/quotations', icon: FileText, iconColor: '#DA3D27' },
    { name: 'Inventory', href: '/inventory', icon: ClipboardList, iconColor: '#718A9E' },
    { name: 'To-Do', href: '/todos', icon: CheckSquare, iconColor: '#14804A' },
];

const NavItem = memo(({ item, isActive, isCollapsed, badge }: any) => (
    <Link
        href={item.href}
        className={twMerge(
            'group flex items-center rounded-xl transition-all duration-150 relative text-[13px] font-medium',
            isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5',
            isActive
                ? 'bg-[#E6F2F7] text-[#024B62] font-semibold border border-[#036989]/20 shadow-xs'
                : 'text-[#3B556E] hover:bg-[#F4F6F9] hover:text-[#11253E] border border-transparent'
        )}
        title={isCollapsed ? item.name : ""}
    >
        <item.icon
            className={twMerge(
                'h-4.5 w-4.5 flex-shrink-0 transition-transform duration-150 group-hover:scale-110',
                isCollapsed ? "" : "mr-3"
            )}
            style={{ color: item.iconColor }}
        />
        {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
        {badge > 0 && (
            <span className={twMerge(
                'absolute flex items-center justify-center rounded-full text-[9px] font-black bg-[#DA3D27] text-white leading-none shadow-sm',
                isCollapsed
                    ? 'w-4 h-4 top-1 right-1'
                    : 'min-w-[18px] h-[18px] px-1 -top-1 -right-1'
            )}>
                {badge > 99 ? '99+' : badge}
            </span>
        )}
    </Link>
));
NavItem.displayName = 'NavItem';

interface SidebarProps {
    isCollapsed: boolean;
    setIsCollapsed: (val: boolean) => void;
}

export function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
    const pathname = usePathname();
    const { user, signOut } = useAuth();
    const { toggleNavStyle } = useLayout();
    const [todoBadge, setTodoBadge] = useState(0);

    useEffect(() => {
        async function fetchTodoBadge() {
            try {
                const { count } = await supabase
                    .from('order_todos')
                    .select('id', { count: 'exact', head: true })
                    .eq('done', false)
                    .eq('skipped', false);
                setTodoBadge(count || 0);
            } catch {}
        }
        fetchTodoBadge();
        const interval = setInterval(fetchTodoBadge, 60000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className={twMerge(
            "hidden border-r border-[#E2E8F0] bg-white md:block transition-all duration-300 ease-in-out text-[#11253E] h-screen sticky top-0 z-50 shadow-xs",
            isCollapsed ? "w-20" : "w-36 lg:w-44"
        )}>
            <div className="flex h-[76px] items-center border-b border-[#E2E8F0] px-4 justify-center overflow-hidden bg-white">
                {!isCollapsed && (
                    <img
                        src="/logos/logo_main_user_transparent.png"
                        alt="CPack Logo"
                        className="h-11 w-auto transition-all duration-300"
                    />
                )}
                {isCollapsed && (
                    <img
                        src="/logos/logo_main_user_transparent.png"
                        alt="CPack Logo"
                        className="h-8 w-8 object-contain mx-auto"
                    />
                )}
            </div>

            {/* Collapse toggle */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-20 bg-white rounded-full p-1 border border-[#E2E8F0] shadow-sm hover:bg-[#F4F6F9] text-[#3B556E] hover:text-[#036989] transition-colors z-50"
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
                {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
            </button>

            {/* Layout Switch Toggle */}
            <button
                onClick={toggleNavStyle}
                className={twMerge(
                    "absolute -right-3 top-32 bg-white rounded-full p-1.5 border border-[#E2E8F0] shadow-sm hover:bg-[#F4F6F9] transition-all z-50 group",
                    "text-[#3B556E] hover:text-[#036989]"
                )}
                title="Switch to Top Navigation"
            >
                <Tally2 className="h-3 w-3 rotate-90" />
            </button>

            <div className="px-2.5 py-4">
                <nav className="space-y-1">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href || (
                            item.href !== '/' &&
                            pathname.startsWith(item.href + '/') &&
                            !navigation.some(nav => nav.href !== item.href && nav.href.startsWith(item.href) && pathname.startsWith(nav.href))
                        );

                        return (
                            <NavItem
                                key={item.name}
                                item={item}
                                isActive={isActive}
                                isCollapsed={isCollapsed}
                                badge={item.href === '/todos' ? todoBadge : 0}
                            />
                        );
                    })}
                </nav>
            </div>

            <div className={twMerge(
                "absolute bottom-5 left-0 right-0 px-2.5 transition-opacity duration-300",
                isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
            )}>
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2.5 rounded-xl bg-[#F4F6F9] p-2.5 border border-[#E2E8F0]">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#11395D] via-[#036989] to-[#FD9B6C] flex items-center justify-center shadow-xs shrink-0">
                            <User className="h-4 w-4 text-white" />
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-[11px] font-bold text-[#11253E] truncate uppercase tracking-tight">
                                {user?.email?.split('@')[0] || 'Admin'}
                            </p>
                            <p className="text-[8px] text-[#718A9E] font-semibold truncate uppercase tracking-widest"> Authorized </p>
                        </div>
                    </div>
                    <button
                        onClick={() => signOut()}
                        className="flex items-center gap-2.5 w-full p-2 rounded-xl text-[#3B556E] hover:bg-[#FCEAE6] hover:text-[#8D2F18] transition-all border border-transparent hover:border-[#8D2F18]/20"
                    >
                        <LogOut className="h-4 w-4 text-[#8D2F18]" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Sign Out</span>
                    </button>
                </div>
            </div>

            {isCollapsed && (
                <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                    <div className="h-9 w-9 rounded-xl bg-[#E6F2F7] flex items-center justify-center border border-[#036989]/20">
                        <span className="text-xs font-black text-[#024B62]">CP</span>
                    </div>
                </div>
            )}
        </div>
    );
}
