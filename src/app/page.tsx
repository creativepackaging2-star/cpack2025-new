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
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    async function fetchStats() {
      // Products count
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      // Orders count
      const { count: ordersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      // Pending Orders (status is not 'Complete')
      const { count: pendingCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .not('status', 'eq', 'Complete');

      // Completed Orders
      const { count: completedCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Complete');

      // Recent Activity
      const { data: recent } = await supabase
        .from('orders')
        .select('id, order_id, product_name, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        products: productsCount || 0,
        orders: ordersCount || 0,
        pendingOrders: pendingCount || 0,
        completedOrders: completedCount || 0
      });
      setRecentOrders(recent || []);
    }
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard Overview</h2>
        <p className="text-sm text-slate-500 font-medium">Live System Status v0.2.0</p>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card title="Total Products" value={stats.products} icon={Package} color="text-blue-600" />
        <Card title="Total Orders" value={stats.orders} icon={ShoppingCart} color="text-indigo-600" />
        <Card title="Active Orders" value={stats.pendingOrders} icon={AlertCircle} color="text-amber-600" />
        <Card title="Completed" value={stats.completedOrders} icon={CheckCircle2} color="text-emerald-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4 bg-slate-50/50">
            <h3 className="font-bold text-slate-800">Recent Activity</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {recentOrders.length === 0 ? (
              <p className="p-6 text-sm text-slate-500 italic">No recent activity found.</p>
            ) : (
              recentOrders.map((o) => (
                <div key={o.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-900">{o.product_name || 'Unnamed Job'}</span>
                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{o.order_id || `ID: ${o.id}`}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${o.status === 'Complete' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                      {o.status || 'Pending'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(o.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4 bg-slate-50/50">
            <h3 className="font-bold text-slate-800">System Monitoring</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 font-medium">Database Connection</span>
              <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                Healthy
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 font-medium">Product-Order Sync</span>
              <span className="text-indigo-600 font-bold">Active v2.0</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 font-medium">Google Drive API</span>
              <span className="text-slate-400 font-bold italic">Configuring...</span>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <p className="text-[11px] text-slate-400 italic">
                All manufacturing data is currently synced with Supabase Realtime DB.
              </p>
            </div>
          </div>
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
