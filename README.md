# SPARK DOCS - Setup Instructions

## 1. Supabase Setup
Create a table named `documents` in your Supabase project with the following columns:

| Column Name | Type | Default |
|-------------|------|---------|
| id          | uuid | `gen_random_uuid()` (Primary Key) |
| created_at  | timestamp | `now()` |
| type        | text | - |
| data        | jsonb | - |
| fullName    | text | - |
| email       | text | - |
| is_paid     | boolean | `false` |

## 2. Environment Variables
Create a `.env` file in the root directory and add your keys:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_PAYSTACK_PUBLIC_KEY=pk_test_your_key
```

## 3. Admin Access
For the demo, clicking the "Admin Login" button in the footer or the Shield icon in the header will grant access. In a production environment, you should implement proper Supabase Auth.

## 4. Payment
The payment is handled via Paystack. Ensure you have a valid Paystack account and replace the public key in your `.env` file.
```
