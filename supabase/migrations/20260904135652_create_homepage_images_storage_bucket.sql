/*
# Create homepage-images storage bucket

1. Storage
- Create a public bucket named `homepage-images` for storing homepage section background images.
- Public bucket so the public homepage can read the images without authentication.
2. Policies
- SELECT (read): allow anyone (anon, authenticated) to read objects — the homepage is public.
- INSERT: allow authenticated users to upload — only logged-in admins.
- UPDATE: allow authenticated users to replace objects.
- DELETE: allow authenticated users to remove objects.
3. Notes
- The bucket is public, so no signed URLs are needed for the public homepage.
- Upload is restricted to authenticated users (admins).
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('homepage-images', 'homepage-images', true)
ON CONFLICT (id) DO NOTHING;

-- SELECT: public read
DROP POLICY IF EXISTS "public_read_homepage_images" ON storage.objects;
CREATE POLICY "public_read_homepage_images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'homepage-images');

-- INSERT: authenticated only
DROP POLICY IF EXISTS "auth_insert_homepage_images" ON storage.objects;
CREATE POLICY "auth_insert_homepage_images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'homepage-images');

-- UPDATE: authenticated only
DROP POLICY IF EXISTS "auth_update_homepage_images" ON storage.objects;
CREATE POLICY "auth_update_homepage_images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'homepage-images')
  WITH CHECK (bucket_id = 'homepage-images');

-- DELETE: authenticated only
DROP POLICY IF EXISTS "auth_delete_homepage_images" ON storage.objects;
CREATE POLICY "auth_delete_homepage_images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'homepage-images');
