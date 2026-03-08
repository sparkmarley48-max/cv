-- SQL INSTRUCTIONS FOR SUPABASE DATABASE

-- 1. Create Documents Table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    type TEXT NOT NULL,
    template TEXT,
    email TEXT NOT NULL,
    fullName TEXT,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_paid BOOLEAN DEFAULT false,
    price NUMERIC DEFAULT 0
);

-- Enable Row Level Security (RLS) for Documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 2. Setup Document RLS Policies
-- Users can see their own documents
CREATE POLICY "Users can view own documents" 
ON public.documents FOR SELECT 
USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = public.documents.email
) OR (
    -- Allow super admin to see all documents
    auth.email() = 'couragelanza@gmail.com'
));

-- Users can insert their own documents
CREATE POLICY "Users can insert own documents" 
ON public.documents FOR INSERT 
WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = public.documents.email
));

-- Users can update their own documents
CREATE POLICY "Users can update own documents" 
ON public.documents FOR UPDATE 
USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = public.documents.email
) OR (
    -- Allow super admin to update all documents
    auth.email() = 'couragelanza@gmail.com'
));

-- Users can delete their own documents
CREATE POLICY "Users can delete own documents" 
ON public.documents FOR DELETE 
USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE email = public.documents.email
) OR (
    -- Allow super admin to delete all documents
    auth.email() = 'couragelanza@gmail.com'
));


-- 3. Create Admins Table
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    email TEXT UNIQUE NOT NULL,
    approved BOOLEAN DEFAULT false
);

-- Enable RLS for Admins
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- 4. Setup Admins RLS Policies
-- Only super admins can view/manage the admins table, but everyone needs to read.
CREATE POLICY "Anyone can read admins table"
ON public.admins FOR SELECT
USING (true);

-- Users sign up and log via edge function but insert into admins
-- Only allow inserting self or allow if you are the super admin.
CREATE POLICY "Can insert self to admins or true if super admin"
ON public.admins FOR INSERT
WITH CHECK (
    auth.uid() IN (SELECT id FROM auth.users WHERE email = public.admins.email)
    OR auth.email() = 'couragelanza@gmail.com'
);

-- Only super admin can update the admins table (i.e. to mark "approved" as true)
CREATE POLICY "Only super admin can update admins table"
ON public.admins FOR UPDATE
USING (auth.email() = 'couragelanza@gmail.com');

-- Only super admin can delete from the admins table
CREATE POLICY "Only super admin can delete admins from table"
ON public.admins FOR DELETE
USING (auth.email() = 'couragelanza@gmail.com');


-- 5. Helper Function: Make Super Admin auto-approved
-- Just a safeguard, super admin doesn't inherently need a row, but if they login, they skip logic.
INSERT INTO public.admins (id, email, approved)
VALUES (gen_random_uuid(), 'couragelanza@gmail.com', true)
ON CONFLICT (email) DO UPDATE SET approved = true;
