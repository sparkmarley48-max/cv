import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

const envPath = 'c:/Users/Spark Marley/Desktop/CV MAKER/.env';
dotenv.config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking documents table schema...');
    const { data, error } = await supabase.from('documents').select('*').limit(1);

    if (error) {
        console.error('Error fetching documents:', error.message);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns found:', Object.keys(data[0]));
    } else {
        console.log('No documents found to check schema. Trying to fetch table info...');
        // Fallback: try to insert a dummy doc and see if it fails on 'price' or check if we can query the information_schema
        // Actually, let's just try to select one row and see the keys if we can find ANY row.
        const { data: anyData, error: anyError } = await supabase.from('documents').select('*').limit(1);
        if (anyData) console.log('Columns:', Object.keys(anyData[0] || {}));
    }
}

checkSchema();
