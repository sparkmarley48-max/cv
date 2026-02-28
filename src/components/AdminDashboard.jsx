import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    FileText,
    Eye,
    Edit,
    Trash2,
    CheckCircle,
    XCircle,
    Search,
    ArrowLeft,
    RefreshCw,
    Mail,
    Clock,
    CreditCard,
    LogOut,
    TrendingUp,
    Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminDashboard({ onEdit, onBack, currentPrice, onPriceChange, onLogout }) {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [newPrice, setNewPrice] = useState(currentPrice);
    const [activeTab, setActiveTab] = useState('documents'); // 'documents' or 'pricing'

    // Pricing categories defaults - in a real app these session from DB
    const [typePrices, setTypePrices] = useState({
        cv: 20,
        letter: 15,
        tenancy: 50,
        job_offer: 25,
        invoice: 10
    });

    const handlePriceSubmit = () => {
        onPriceChange(parseFloat(newPrice));
        alert('Global base price updated successfully');
    };

    useEffect(() => {
        fetchDocs();
    }, []);

    async function fetchDocs() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setDocs(data || []);
        } catch (err) {
            console.error('Error fetching docs:', err);
        } finally {
            setLoading(false);
        }
    }

    async function createTestDoc() {
        setLoading(true);
        const testDoc = {
            fullName: 'Test Document (Delete Me)',
            email: 'test@example.com',
            type: 'cv',
            data: {},
            is_paid: false,
            price: currentPrice
        };
        const { error } = await supabase.from('documents').insert(testDoc);
        if (error) alert('Failed to create test doc: ' + error.message);
        else fetchDocs();
    }

    async function updateDocPrice(id, price) {
        const numericPrice = parseFloat(price);
        if (isNaN(numericPrice)) return;

        try {
            const { error } = await supabase
                .from('documents')
                .update({ price: numericPrice })
                .eq('id', id);
            if (error) throw error;
            // Update local state immediately for snappy feel
            setDocs(docs.map(d => d.id === id ? { ...d, price: numericPrice } : d));
        } catch (err) {
            alert('Failed to update individual price. Make sure your "documents" table has a "price" column.');
        }
    }

    async function togglePaymentStatus(doc) {
        try {
            const { error } = await supabase
                .from('documents')
                .update({ is_paid: !doc.is_paid })
                .eq('id', doc.id);
            if (error) throw error;
            fetchDocs();
        } catch (err) {
            alert('Failed to update status');
        }
    }

    async function deleteDoc(id) {
        if (!confirm('Are you sure you want to delete this document?')) return;
        try {
            const { error } = await supabase
                .from('documents')
                .delete()
                .eq('id', id);
            if (error) throw error;
            fetchDocs();
        } catch (err) {
            alert('Delete failed');
        }
    }

    const filteredDocs = docs.filter(doc =>
        doc.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.type?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalRevenue = docs.filter(d => d.is_paid).reduce((acc, current) => acc + (current.price || 0), 0);

    return (
        <div className="min-h-screen bg-bg pb-20 px-4 md:px-6">
            <div className="container py-8 max-w-7xl">
                {/* Modern Header */}
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
                            <h1 className="text-3xl font-extrabold tracking-tight">Admin Console</h1>
                            <div className="flex items-center gap-4 mt-1">
                                <button
                                    onClick={() => setActiveTab('documents')}
                                    className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg transition-all ${activeTab === 'documents' ? 'bg-primary text-white' : 'text-text-muted hover:bg-black/5'}`}
                                >
                                    Records
                                </button>
                                <button
                                    onClick={() => setActiveTab('pricing')}
                                    className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-lg transition-all ${activeTab === 'pricing' ? 'bg-primary text-white' : 'text-text-muted hover:bg-black/5'}`}
                                >
                                    Price Settings
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
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

                {/* Tab Content */}
                {activeTab === 'pricing' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="card !p-8"
                        >
                            <h2 className="text-xl font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                                <TrendingUp className="text-primary" size={24} /> Global Default
                            </h2>
                            <p className="text-sm text-text-muted mb-8 font-medium italic">
                                This price applies to all documents that don't have a specific individual price set.
                            </p>
                            <div className="flex items-center gap-4 bg-black/5 p-6 rounded-2xl border border-card-border">
                                <div className="flex-1">
                                    <p className="text-[10px] text-text-muted uppercase font-black tracking-widest mb-1">Current Base Price</p>
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl font-black">GH₵</span>
                                        <input
                                            type="number"
                                            className="input !py-2 !px-4 font-bold !w-28 text-xl bg-white/5 border-none outline-none shadow-inner"
                                            value={newPrice}
                                            onChange={(e) => setNewPrice(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handlePriceSubmit}
                                    className="btn btn-primary !h-14 !px-8 text-xs font-black uppercase tracking-[0.2em]"
                                >
                                    Update Global
                                </motion.button>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="card !p-8"
                        >
                            <h2 className="text-xl font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                                <CreditCard className="text-primary" size={24} /> Category Defaults
                            </h2>
                            <div className="space-y-4">
                                {Object.entries(typePrices).map(([type, price]) => (
                                    <div key={type} className="flex items-center justify-between p-4 bg-black/5 rounded-xl border border-black/5 hover:border-primary/20 transition-all group">
                                        <span className="text-xs font-black uppercase tracking-widest text-text-muted group-hover:text-primary transition-colors">
                                            {type.replace(/_/g, ' ')}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-text-muted">GH₵</span>
                                            <input
                                                type="number"
                                                className="w-16 bg-transparent border-none outline-none text-right font-black text-sm"
                                                value={price}
                                                onChange={(e) => setTypePrices({ ...typePrices, [type]: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[10px] text-text-muted mt-6 italic opacity-50">Note: These are local state defaults for this session only in this demo.</p>
                        </motion.div>
                    </div>
                ) : (
                    <>
                        {/* Stats Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="card !p-6 md:!p-8 flex items-center justify-between overflow-hidden relative"
                            >
                                <div className="card-watermark text-primary">
                                    <TrendingUp size={160} />
                                </div>
                                <div className="relative z-10">
                                    <p className="text-[10px] text-text-muted uppercase font-black tracking-[0.1em] mb-2 opacity-70">Total Revenue</p>
                                    <h3 className="text-3xl font-black">GH₵ {totalRevenue.toLocaleString()}</h3>
                                </div>
                                <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 relative z-10 shadow-sm border border-green-500/10">
                                    <TrendingUp size={28} />
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="card !p-6 md:!p-8 flex items-center justify-between relative overflow-hidden"
                            >
                                <div className="card-watermark text-primary">
                                    <FileText size={160} />
                                </div>
                                <div className="relative z-10">
                                    <p className="text-[10px] text-text-muted uppercase font-black tracking-[0.1em] mb-2 opacity-70">Documents</p>
                                    <h3 className="text-3xl font-black">{docs.length}</h3>
                                </div>
                                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary relative z-10 shadow-sm border border-primary/10">
                                    <FileText size={28} />
                                </div>
                            </motion.div>
                        </div>

                        {/* Main Content Area */}
                        <div className="flex flex-col gap-8">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black/5 p-4 rounded-2xl border border-card-border">
                                <div className="relative flex-1 max-w-lg">
                                    <div className="input-icon-wrapper w-full group">
                                        <Search className="text-text-muted group-focus-within:text-primary transition-colors" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Search by name, email or type..."
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
                                    <p className="text-text-muted text-sm font-bold uppercase tracking-widest animate-pulse">Synchronizing Data...</p>
                                </div>
                            ) : (
                                <motion.div
                                    layout
                                    className="grid gap-4"
                                >
                                    <AnimatePresence>
                                        {filteredDocs.map((doc) => (
                                            <motion.div
                                                layout
                                                key={doc.id}
                                                initial={{ opacity: 0, scale: 0.98 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="card !p-4 md:!p-6 flex flex-col md:flex-row md:items-center justify-between hover:border-primary transition-all gap-6 border-l-8 overflow-hidden group relative"
                                                style={{ borderInlineStartColor: doc.is_paid ? '#10b981' : '#f59e0b' }}
                                            >
                                                <div className="flex items-center gap-4 flex-1 min-w-0 relative z-10">
                                                    <div className="w-14 h-14 rounded-2xl bg-black/5 flex items-center justify-center text-primary flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                                                        <FileText size={28} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">{doc.fullName || 'Untitled Document'}</h3>
                                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                                            <div className="flex items-center gap-2 text-text-muted text-xs font-medium">
                                                                <Mail size={12} className="opacity-50" /> {doc.email || 'No email provided'}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[10px] text-text-muted uppercase font-black tracking-widest">
                                                                <Clock size={12} className="opacity-50" /> {doc.type.replace(/_/g, ' ')} • {new Date(doc.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center justify-between md:justify-end gap-6 border-t md:border-0 pt-4 md:pt-0 relative z-10">
                                                    {/* Price Editor for this document */}
                                                    <div className="flex flex-col items-end gap-1">
                                                        <p className="text-[8px] font-black text-text-muted uppercase tracking-widest opacity-50">Doc Price (GH₵)</p>
                                                        <div className="flex items-center gap-2 bg-black/5 px-3 py-1.5 rounded-xl border border-black/5 focus-within:border-primary/50 transition-all">
                                                            <input
                                                                type="number"
                                                                className="w-16 bg-transparent border-none outline-none font-black text-sm text-right"
                                                                value={doc.price || currentPrice}
                                                                onBlur={(e) => updateDocPrice(doc.id, e.target.value)}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setDocs(docs.map(d => d.id === doc.id ? { ...d, price: val } : d));
                                                                }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => togglePaymentStatus(doc)}
                                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black transition-all border shadow-sm ${doc.is_paid
                                                            ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20'
                                                            : 'bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20'
                                                            }`}
                                                    >
                                                        {doc.is_paid ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                                        {doc.is_paid ? 'VERIFIED PAID' : 'PENDING PAYMENT'}
                                                    </button>

                                                    <div className="flex gap-2">
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => onEdit(doc)}
                                                            className="btn btn-ghost !p-3 rounded-xl hover:text-primary hover:bg-primary/10 border-none bg-black/5"
                                                            title="Edit Content"
                                                        >
                                                            <Edit size={20} />
                                                        </motion.button>
                                                        <motion.button
                                                            whileHover={{ scale: 1.1 }}
                                                            whileTap={{ scale: 0.9 }}
                                                            onClick={() => deleteDoc(doc.id)}
                                                            className="btn btn-ghost !p-3 rounded-xl hover:text-red-500 hover:bg-red-500/10 border-none bg-black/5"
                                                            title="Permanent Delete"
                                                        >
                                                            <Trash2 size={20} />
                                                        </motion.button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>

                                    {filteredDocs.length === 0 && (
                                        <div className="text-center py-20 card border-2 border-dashed border-card-border bg-transparent shadow-none flex flex-col items-center">
                                            <div className="w-20 h-20 bg-black/5 rounded-full flex items-center justify-center mb-6 text-text-muted opacity-30">
                                                <Search size={40} />
                                            </div>
                                            <p className="text-text-muted font-black text-xs uppercase tracking-[0.2em] mb-2">No matching records found</p>
                                            <p className="text-[10px] text-text-muted mb-6 opacity-60 max-w-xs mx-auto">Individual document prices are managed here once you have entries.</p>

                                            <div className="flex gap-4">
                                                <button
                                                    onClick={() => setSearchTerm('')}
                                                    className="btn btn-ghost text-[10px] font-black uppercase tracking-widest px-4 py-2"
                                                >
                                                    Clear Search
                                                </button>
                                                <button
                                                    onClick={createTestDoc}
                                                    className="btn btn-primary text-[10px] font-black uppercase tracking-widest px-6 py-2"
                                                >
                                                    Create Test Entry
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
