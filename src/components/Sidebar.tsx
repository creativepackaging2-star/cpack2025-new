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

const NavItem = memo(({ item, isActive, isCollapsed, badge }: any) => (
    <Link
        href={item.href}
        className={twMerge(
            'group flex items-center rounded-xl transition-all duration-150 relative text-[13px] font-medium',
            isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5',
            isActive
                ? 'bg-[#EEF0FF] text-[#322A9E] font-semibold border border-[#4338CA]/15 shadow-sm'
                : 'text-[#4B5068] hover:bg-[#F6F7FB] hover:text-[#171A2B] border border-transparent'
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
                'absolute flex items-center justify-center rounded-full text-[9px] font-black bg-[#BE2D3A] text-white leading-none shadow-sm',
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
            "hidden border-r border-[#E6E8F0] bg-white md:block transition-all duration-300 ease-in-out text-[#171A2B] h-screen sticky top-0 z-50 shadow-sm",
            isCollapsed ? "w-20" : "w-36 lg:w-44"
        )}>
            <div className="flex h-[76px] items-center border-b border-[#E6E8F0] px-4 justify-center overflow-hidden bg-white">
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
                className="absolute -right-3 top-20 bg-white rounded-full p-1 border border-[#E6E8F0] shadow-md hover:bg-[#F6F7FB] text-[#4B5068] hover:text-[#171A2B] transition-colors z-50"
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
                {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
            </button>

            {/* Layout Switch Toggle */}
            <button
                onClick={toggleNavStyle}
                className={twMerge(
                    "absolute -right-3 top-32 bg-white rounded-full p-1.5 border border-[#E6E8F0] shadow-md hover:bg-[#F6F7FB] transition-all z-50 group",
                    "text-[#4B5068] hover:text-[#4338CA]"
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
                    <div className="flex items-center gap-2.5 rounded-xl bg-[#F6F7FB] p-2.5 border border-[#E6E8F0]">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#6D5EF0] to-[#C42B7A] flex items-center justify-center shadow-sm shrink-0">
                            <User className="h-4 w-4 text-white" />
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-[11px] font-bold text-[#171A2B] truncate uppercase tracking-tight">
                                {user?.email?.split('@')[0] || 'Admin'}
                            </p>
                            <p className="text-[8px] text-[#8A8FA6] font-semibold truncate uppercase tracking-widest"> Authorized </p>
                        </div>
                    </div>
                    <button
                        onClick={() => signOut()}
                        className="flex items-center gap-2.5 w-full p-2 rounded-xl text-[#4B5068] hover:bg-[#FCE8EA] hover:text-[#BE2D3A] transition-all border border-transparent hover:border-[#BE2D3A]/20"
                    >
                        <LogOut className="h-4 w-4 text-[#BE2D3A]" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Sign Out</span>
                    </button>
                </div>
            </div>

            {isCollapsed && (
                <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                    <div className="h-9 w-9 rounded-xl bg-[#EEF0FF] flex items-center justify-center border border-[#4338CA]/20">
                        <span className="text-xs font-black text-[#322A9E]">CP</span>
                    </div>
                </div>
            )}
        </div>
    );
}
