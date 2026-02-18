-- FORCE ENABLE STORAGE (If not enabled)
-- Note: 'storage' schema usually exists by default, but verifying.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create the bucket (Idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-files', 'product-files', true, null, null)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. DROP ALL EXISTING POLICIES to avoid conflicts/leftovers
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow Updates" ON storage.objects;
DROP POLICY IF EXISTS "Public Select" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert" ON storage.objects;
DROP POLICY IF EXISTS "Public Update" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete" ON storage.objects;

-- 3. CREATE ULTRA-PERMISSIVE POLICIES (Test Mode)
-- Allow anyone to SELECT (Read)
CREATE POLICY "Public Select"
ON storage.objects FOR SELECT
USING ( bucket_id = 'product-files' );

-- Allow anyone to INSERT (Upload) - even unauthenticated (ANON)
CREATE POLICY "Public Insert"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'product-files' );

-- Allow anyone to UPDATE
CREATE POLICY "Public Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'product-files' );

-- Allow anyone to DELETE (Cleanup)
CREATE POLICY "Public Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'product-files' );
