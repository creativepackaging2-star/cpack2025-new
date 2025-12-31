-- Create a new storage bucket for product files
insert into storage.buckets
  (id, name, public)
values
  ('product-files', 'product-files', true)
on conflict (id) do nothing;

-- Set up security policies to allow public access (simplest for this use case)
-- Allow anyone to read
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'product-files' );

-- Allow authenticated users (or anyone if anon key used for uploads) to upload
-- Assuming anon key is used by the app
create policy "Allow Uploads"
  on storage.objects for insert
  with check ( bucket_id = 'product-files' );

-- Allow updates if needed
create policy "Allow Updates"
  on storage.objects for update
  with check ( bucket_id = 'product-files' );
