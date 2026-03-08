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
            console.log('Attempting sign in for:', email);
            if (isSignUp) {
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (signUpError) throw signUpError;

                // Ensure users don't automatically get admin approval
                await supabase.from('admins').insert([{ email, approved: false }]);

                alert('Account created! Please check your email for a verification link to confirm your account.');
                setIsSignUp(false);
            } else {
                const { data, error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (signInError) {
                    console.error('Sign in error details:', signInError);
                    throw signInError;
                }
                localStorage.setItem('is_admin', 'true');
                onLogin(data.user);
            }
        } catch (err) {
            console.error('Caught auth error:', err);

            if (err.status === 429 || err.message?.toLowerCase().includes('rate limit')) {
                setError('Too many requests. Please wait a minute or use the Dev Bypass at the bottom.');
            } else if (err.message === 'Email not confirmed') {
                setError('Email not confirmed. Please check your inbox (and spam) for a verification link from Supabase.');
            } else if (err.message?.toLowerCase().includes('invalid login credentials')) {
                setError('Invalid email or password. Are you sure your account is approved?');
            } else {
                setError(err.message || 'Authentication failed');
            }
        } finally {
            setLoading(false);
        }
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
                        <Lock size={32} />
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight mb-2">
                        {isSignUp ? 'Create Account' : 'Welcome Back'}
                    </h2>
                    <p className="text-text-muted text-sm">
                        {isSignUp ? 'Set up your account credentials.' : 'Secure access to your SPARK DOCS dashboard.'}
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
                        <label className="label">Email Address</label>
                        <div className="input-icon-wrapper group">
                            <Mail className="text-text-muted group-focus-within:text-primary transition-colors" size={18} />
                            <input
                                type="email"
                                required
                                className="input w-full"
                                placeholder="name@example.com"
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
                        {isSignUp ? 'Already have an account? Sign In' : 'First time? Create Account'}
                    </button>
                </div>

                <p className="text-center text-[10px] text-text-muted uppercase font-bold tracking-widest mt-12 opacity-30">
                    Proprietary System • Authorized Use Only
                </p>
            </motion.div>
        </div>
    );
}
