-- 1. Add avatar_url column to children table
ALTER TABLE children ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Create the 'avatars' storage bucket (public so images can be displayed)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Allow authenticated users to upload to the avatars bucket
CREATE POLICY "Allow authenticated uploads to avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- 4. Allow public read access to avatars (so images can be displayed)
CREATE POLICY "Allow public read access to avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- 5. Allow authenticated users to update their own avatars
CREATE POLICY "Allow authenticated updates to avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

-- 6. Allow authenticated users to delete their own avatars
CREATE POLICY "Allow authenticated deletes from avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');
