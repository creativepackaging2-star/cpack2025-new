'use client';

import { useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Loader2, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<'login' | 'forgot'>('login');
    const [resetSent, setResetSent] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) {
            setError(authError.message);
            setLoading(false);
        } else {
            router.push('/');
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) { setError('Please enter your email address first.'); return; }
        setLoading(true);
        setError(null);
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/login`,
        });
        setLoading(false);
        if (resetError) {
            setError(resetError.message);
        } else {
            setResetSent(true);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-600 rounded-full blur-[120px]"></div>
            </div>

            <div className="w-full max-w-md relative">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
                    <div className="p-8 pb-4 text-center">
                        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-600/20 mb-6 transition-transform hover:scale-105 active:scale-95">
                            <ShieldCheck className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight uppercase">CPack Admin</h1>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">
                            {mode === 'login' ? 'Secured Access Only' : 'Password Reset'}
                        </p>
                    </div>

                    {resetSent ? (
                        <div className="p-8 pt-2 text-center space-y-4">
                            <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
                            <p className="text-white font-bold text-base">Reset email sent!</p>
                            <p className="text-slate-400 text-sm">
                                Check your inbox at{' '}
                                <span className="text-indigo-400 font-semibold">{email}</span>{' '}
                                and click the reset link to set a new password.
                            </p>
                            <button
                                onClick={() => { setResetSent(false); setMode('login'); }}
                                className="text-[12px] font-bold text-indigo-400 hover:text-indigo-300 underline uppercase tracking-widest"
                            >
                                ← Back to Login
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={mode === 'login' ? handleLogin : handleForgotPassword} className="p-8 pt-4 space-y-6">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0"></div>
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                {/* Email */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                                            <Mail className="h-4 w-4" />
                                        </div>
                                        <input
                                            type="email"
                                            required
                                            className="block w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-2xl text-white text-sm font-semibold placeholder-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                            placeholder="admin@cpack.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Password — only in login mode */}
                                {mode === 'login' && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                                                <Lock className="h-4 w-4" />
                                            </div>
                                            <input
                                                type="password"
                                                required
                                                className="block w-full pl-11 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-2xl text-white text-sm font-semibold placeholder-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="group w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-black text-sm tracking-widest uppercase transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50"
                            >
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : mode === 'login' ? (
                                    <>Log In <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" /></>
                                ) : (
                                    <>Send Reset Email <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" /></>
                                )}
                            </button>

                            <div className="text-center">
                                {mode === 'login' ? (
                                    <button
                                        type="button"
                                        onClick={() => { setMode('forgot'); setError(null); }}
                                        className="text-[11px] font-bold text-slate-500 hover:text-indigo-400 transition-colors uppercase tracking-widest"
                                    >
                                        Forgot password?
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => { setMode('login'); setError(null); }}
                                        className="text-[11px] font-bold text-slate-500 hover:text-indigo-400 transition-colors uppercase tracking-widest"
                                    >
                                        ← Back to Login
                                    </button>
                                )}
                            </div>
                        </form>
                    )}

                    <div className="p-6 bg-slate-800/20 border-t border-slate-800/50 text-center">
                        <p className="text-[10px] text-slate-500 font-medium tracking-tight">
                            Powered by <span className="text-slate-300 font-bold">CPack Data Systems</span>
                        </p>
                    </div>
                </div>

                <p className="mt-8 text-center text-[11px] text-slate-600 font-medium px-4">
                    Authorized personnel only. All access, including failed attempts, are recorded and monitored for security purposes.
                </p>
            </div>
        </div>
    );
}
