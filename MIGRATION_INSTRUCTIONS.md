# Database Migration Instructions

Your Supabase database is missing the required tables. Follow these steps to set up your database:

## Option 1: Using Supabase Dashboard (Recommended)

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to the **SQL Editor** in the left sidebar
4. Copy and paste the contents of each migration file in this order:

   **Step 1:** Copy and run `supabase/migrations/create_profiles_table.sql`
   **Step 2:** Copy and run `supabase/migrations/create_medical_records_table.sql`  
   **Step 3:** Copy and run `supabase/migrations/create_change_logs_table.sql`

5. Click **Run** for each migration
6. Refresh your application - the errors should be resolved

## Option 2: Using Supabase CLI (If you have it installed)

```bash
# If you have Supabase CLI installed locally
supabase migration up
```

## Verification

After running the migrations, you should see these tables in your Supabase database:
- `profiles` - User management and roles
- `medical_records_clean` - Medical records data
- `change_logs` - Audit trail for changes

The application should now work without the "Failed to fetch" errors.

## What These Migrations Do

1. **Profiles Table**: Manages user roles, branch assignments, and approval status
2. **Medical Records Table**: Stores all patient and medical data with proper security policies
3. **Change Logs Table**: Tracks all changes made to medical records for audit purposes

All tables include Row Level Security (RLS) policies to ensure proper data access control based on user roles and branch assignments.