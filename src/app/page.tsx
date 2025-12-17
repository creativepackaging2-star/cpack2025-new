'use client';

import { supabase } from '@/utils/supabase/client';
import { Package, ShoppingCart, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    products: 0,
    orders: 0,
    pendingOrders: 0,
    completedOrders: 0
  });

  useEffect(() => {
    async function fetchStats() {
      // Products count
      const { count: productsCount } = await supabase
        .from('products') // Trying 'products' first, based on script it might be lowercase
        .select('*', { count: 'exact', head: true });

      // Orders count
      const { count: ordersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      // Pending Orders (assuming status column exists and has generic values like 'Pending' or similar)
      // I'll just count 'orders' for now.

      setStats({
        products: productsCount || 0,
        orders: ordersCount || 0,
        pendingOrders: 0, // Placeholder
        completedOrders: 0 // Placeholder
      });
    }
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card title="Total Products" value={stats.products} icon={Package} color="text-blue-600" />
        <Card title="Total Orders" value={stats.orders} icon={ShoppingCart} color="text-indigo-600" />
        {/* Placeholders for specific status counts */}
        <Card title="Pending Orders" value="-" icon={AlertCircle} color="text-amber-600" />
        <Card title="Completed Orders" value="-" icon={CheckCircle2} color="text-emerald-600" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="font-semibold text-slate-900">Recent Activity</h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-slate-500">Connect to Orders table to view recent activity.</p>
        </div>
      </div>
    </div>
  );
}

function Card({ title, value, icon: Icon, color }: { title: string, value: string | number, icon: any, color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`rounded-full p-3 bg-slate-50 ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
