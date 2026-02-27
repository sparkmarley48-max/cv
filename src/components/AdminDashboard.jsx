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
    CreditCard
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminDashboard({ onEdit, onBack, currentPrice, onPriceChange }) {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [newPrice, setNewPrice] = useState(currentPrice);

    const handlePriceSubmit = () => {
        onPriceChange(parseFloat(newPrice));
        alert('Price updated successfully to GH₵' + newPrice);
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

    return (
        <div className="container py-8 fade-in">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="btn btn-ghost !p-2">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 mb-8">
                <div className="card !p-6 flex-1 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center text-green-500">
                            <CreditCard size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-text-muted uppercase font-bold">Document Price</p>
                            <h3 className="text-xl font-bold">GH₵ {currentPrice}</h3>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            className="input !w-24 !py-2"
                            value={newPrice}
                            onChange={(e) => setNewPrice(e.target.value)}
                        />
                        <button onClick={handlePriceSubmit} className="btn btn-primary !py-2">Update Price</button>
                    </div>
                </div>

                <div className="flex items-center gap-4 flex-1 justify-end">
                    <button onClick={fetchDocs} className={`btn btn-ghost !p-2 ${loading ? 'animate-spin' : ''}`} title="Refresh">
                        <RefreshCw size={20} />
                    </button>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                        <input
                            type="text"
                            placeholder="Search docs..."
                            className="input !pl-10 !w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredDocs.map((doc) => (
                        <div key={doc.id} className="card !p-6 flex flex-col md:flex-row md:items-center justify-between hover:border-primary transition-all gap-6">
                            <div className="flex items-center gap-4 flex-1">
                                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                                    <FileText size={24} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-lg truncate">{doc.fullName || 'Untitled'}</h3>
                                    <div className="flex flex-col gap-1 mt-1">
                                        <div className="flex items-center gap-2 text-text-muted text-xs">
                                            <Mail size={12} /> {doc.email || 'No email provided'}
                                        </div>
                                        <div className="flex items-center gap-2 text-text-muted text-xs uppercase font-bold tracking-widest">
                                            <Clock size={12} /> {doc.type} • {new Date(doc.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-0 pt-4 md:pt-0">
                                <button
                                    onClick={() => togglePaymentStatus(doc)}
                                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black transition-all border ${doc.is_paid
                                        ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                        : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                        }`}
                                >
                                    {doc.is_paid ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                    {doc.is_paid ? 'PAID' : 'UNPAID'}
                                </button>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onEdit(doc)}
                                        className="btn btn-ghost !p-2 hover:text-primary hover:bg-primary/10"
                                        title="Open in Editor"
                                    >
                                        <Edit size={20} />
                                    </button>
                                    <button
                                        onClick={() => deleteDoc(doc.id)}
                                        className="btn btn-ghost !p-2 hover:text-red-500 hover:bg-red-500/10"
                                        title="Delete"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredDocs.length === 0 && (
                        <div className="text-center py-20 card border-dashed">
                            <p className="text-text-muted">No documents found.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
