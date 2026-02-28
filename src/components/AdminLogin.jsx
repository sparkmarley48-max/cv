import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Shield, Lock, Mail, Loader2, ArrowLeft } from 'lucide-react';

export default function AdminLogin({ onLogin, onBack }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isSignUp) {
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (signUpError) throw signUpError;
                alert('Account created! Please check your email for verification (if enabled) or try logging in.');
                setIsSignUp(false);
            } else {
                const { data, error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (signInError) throw signInError;
                localStorage.setItem('is_admin', 'true');
                onLogin(data.user);
            }
        } catch (err) {
            if (err.status === 429) {
                setError('Too many requests. Please wait a minute before trying again.');
            } else if (err.status === 400 && !isSignUp) {
                setError('Invalid email or password. Please check your credentials.');
            } else {
                setError(err.message || 'Authentication failed');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDevBypass = () => {
        localStorage.setItem('is_admin', 'true');
        onLogin({ email: 'dev@sparkdocs.com', id: 'dev' });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card max-w-md w-full !p-8 md:!p-12 relative overflow-hidden"
            >
                {/* Decorative background element */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-secondary/5 rounded-full blur-3xl"></div>

                <button
                    onClick={onBack}
                    className="absolute top-6 left-6 btn btn-ghost !p-2 rounded-full text-text-muted hover:text-primary transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>

                <div className="text-center mb-10 mt-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-primary shadow-inner">
                        <Shield size={32} />
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight mb-2">
                        {isSignUp ? 'Create Admin' : 'Admin Portal'}
                    </h2>
                    <p className="text-text-muted text-sm">
                        {isSignUp ? 'Set up your administrator credentials.' : 'Secure access for SPARK DOCS administrators.'}
                    </p>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-4 rounded-xl mb-6 text-center font-bold"
                    >
                        {error}
                    </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="label">Admin Email</label>
                        <div className="input-icon-wrapper group">
                            <Mail className="text-text-muted group-focus-within:text-primary transition-colors" size={18} />
                            <input
                                type="email"
                                required
                                className="input w-full"
                                placeholder="admin@sparkdocs.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="label">Password</label>
                        <div className="input-icon-wrapper group">
                            <Lock className="text-text-muted group-focus-within:text-primary transition-colors" size={18} />
                            <input
                                type="password"
                                required
                                className="input w-full"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={loading}
                        className="btn btn-primary w-full !py-4 text-base font-bold shadow-lg mt-4"
                        type="submit"
                    >
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <Loader2 size={20} className="animate-spin" />
                                Processing...
                            </div>
                        ) : (
                            isSignUp ? "Register Account" : "Sign In to Dashboard"
                        )}
                    </motion.button>
                </form>

                <div className="mt-12 flex flex-col items-center gap-6">
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="btn-link text-xs uppercase tracking-[0.15em]"
                    >
                        {isSignUp ? 'Already have an account? Sign In' : 'First time? Create Admin Account'}
                    </button>

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-card-border to-transparent opacity-50"></div>

                    <button
                        onClick={handleDevBypass}
                        className="text-[9px] text-text-muted opacity-20 hover:opacity-100 uppercase tracking-[0.3em] font-black transition-all hover:text-primary bg-transparent border-none cursor-pointer outline-none"
                    >
                        Dev Admin Bypass
                    </button>
                </div>

                <p className="text-center text-[10px] text-text-muted uppercase font-bold tracking-widest mt-12 opacity-30">
                    Proprietary System • Authorized Use Only
                </p>
            </motion.div>
        </div>
    );
}
