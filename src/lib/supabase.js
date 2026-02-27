import { createClient } from '@supabase/supabase-js'

let supabase;
try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseUrl.startsWith('https')) {
        throw new Error('Invalid Supabase URL');
    }
    supabase = createClient(supabaseUrl, supabaseAnonKey);
} catch (e) {
    console.warn('Supabase not initialized correctly. Using mock client.');
    supabase = {
        from: () => ({
            select: () => Promise.resolve({ data: [], error: null }),
            insert: () => ({
                select: () => Promise.resolve({ data: [{ id: 'mock' }], error: null })
            }),
            update: () => Promise.resolve({ data: [], error: null }),
            order: () => ({ select: () => Promise.resolve({ data: [], error: null }) }),
        })
    };
}

export { supabase };

export const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_your_key'
