import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    FileText,
    Edit,
    ArrowLeft,
    Search,
    RefreshCw,
    LogOut,
    Clock,
    Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function UserDashboard({ onEdit, onBack, onLogout, userEmail, onCreateNew }) {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchDocs();
    }, []);

    async function fetchDocs() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .eq('email', userEmail)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setDocs(data || []);
        } catch (err) {
            console.error('Error fetching docs:', err);
        } finally {
            setLoading(false);
        }
    }

    const filteredDocs = docs.filter(doc =>
        doc.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.type?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-bg pb-20 px-4 md:px-6">
            <div className="container py-8 max-w-7xl">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div className="flex items-center gap-4">
                        <motion.button
                            whileHover={{ x: -2 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onBack}
                            className="btn btn-ghost !p-2 rounded-full h-12 w-12 border-none shadow-sm"
                        >
                            <ArrowLeft size={24} />
                        </motion.button>
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight">My Documents</h1>
                            <p className="text-sm text-text-muted mt-1">{userEmail}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onCreateNew}
                            className="btn btn-primary shadow-lg"
                        >
                            <Plus size={18} className="mr-2" /> New Document
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onLogout}
                            className="btn btn-ghost !text-red-500 hover:!bg-red-500/10 border-red-500/20"
                        >
                            <LogOut size={18} /> Log Out
                        </motion.button>
                    </div>
                </header>

                <div className="flex flex-col gap-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black/5 p-4 rounded-2xl border border-card-border">
                        <div className="relative flex-1 max-w-lg">
                            <div className="input-icon-wrapper w-full group">
                                <Search className="text-text-muted group-focus-within:text-primary transition-colors" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search your documents..."
                                    className="input !py-3 w-full border-none shadow-none bg-transparent"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={fetchDocs} className={`btn btn-ghost !p-3 rounded-xl border-none bg-black/5 hover:bg-black/10 transition-colors ${loading ? 'animate-spin' : ''}`} title="Refresh">
                                <RefreshCw size={20} />
                            </button>
                            <span className="text-[10px] font-black uppercase tracking-widest text-text-muted px-4 py-2 bg-black/5 rounded-xl border border-black/5">
                                {filteredDocs.length} Entries
                            </span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32 gap-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                            <p className="text-text-muted text-sm font-bold uppercase tracking-widest animate-pulse">Loading Documents...</p>
                        </div>
                    ) : (
                        <motion.div layout className="grid gap-4">
                            <AnimatePresence>
                                {filteredDocs.map((doc) => (
                                    <motion.div
                                        layout
                                        key={doc.id}
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="card !p-4 md:!p-6 flex flex-col md:flex-row md:items-center justify-between hover:border-primary transition-all gap-6 group"
                                    >
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className="w-14 h-14 rounded-2xl bg-black/5 flex items-center justify-center text-primary flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                                                <FileText size={28} />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">{doc.fullName || 'Untitled Document'}</h3>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                                    <div className="flex items-center gap-2 text-[10px] text-text-muted uppercase font-black tracking-widest">
                                                        <Clock size={12} className="opacity-50" /> {doc.type.replace(/_/g, ' ')} • {new Date(doc.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center justify-end gap-6 border-t md:border-0 pt-4 md:pt-0">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${doc.is_paid ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                                {doc.is_paid ? 'PAID' : 'UNPAID'}
                                            </span>
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => onEdit(doc)}
                                                className="btn btn-ghost flex items-center gap-2 !px-4 !py-2 rounded-xl text-primary bg-primary/10 hover:bg-primary/20 hover:shadow-md transition-all"
                                            >
                                                <Edit size={16} /> Open
                                            </motion.button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {filteredDocs.length === 0 && (
                                <div className="text-center py-20 card border-2 border-dashed border-card-border bg-transparent shadow-none flex flex-col items-center">
                                    <div className="w-20 h-20 bg-black/5 rounded-full flex items-center justify-center mb-6 text-text-muted opacity-30">
                                        <FileText size={40} />
                                    </div>
                                    <p className="text-text-muted font-black text-xs uppercase tracking-[0.2em] mb-4">No documents found</p>
                                    <button
                                        onClick={onCreateNew}
                                        className="btn btn-primary text-[10px] font-black uppercase tracking-widest px-6 py-2"
                                    >
                                        Create Your First Document
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}
