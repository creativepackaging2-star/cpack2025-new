-- NUCLEAR STORAGE FIX (Disables all security for product-files bucket)
-- Run this to verify if the issue is permissions.

-- 1. Ensure bucket is public
UPDATE storage.buckets SET public = true WHERE id = 'product-files';

-- 2. Delete ALL existing policies for storage.objects on this bucket
DELETE FROM storage.policies WHERE bucket_id = 'product-files';

-- 3. Add "Master" policies (Allow EVERYTHING for ALL users)
-- Select (Read)
CREATE POLICY "Master_Select" ON storage.objects FOR SELECT TO public USING (bucket_id = 'product-files');

-- Insert (Upload)
CREATE POLICY "Master_Insert" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'product-files');

-- Update
CREATE POLICY "Master_Update" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'product-files');

-- Delete
CREATE POLICY "Master_Delete" ON storage.objects FOR DELETE TO public USING (bucket_id = 'product-files');
