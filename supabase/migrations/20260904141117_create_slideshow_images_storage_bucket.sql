/*
# Create slideshow-images storage bucket

1. Storage
- Create a public bucket named `slideshow-images` for storing slideshow slide images (desktop + mobile).
- Public bucket so the public homepage can read images without authentication.
2. Policies
- SELECT (read): allow anyone (anon, authenticated) to read objects.
- INSERT: allow authenticated users to upload (admins only).
- UPDATE: allow authenticated users to replace objects.
- DELETE: allow authenticated users to remove objects.
3. Notes
- The bucket is public, so no signed URLs are needed for the public homepage.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('slideshow-images', 'slideshow-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public_read_slideshow_images" ON storage.objects;
CREATE POLICY "public_read_slideshow_images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'slideshow-images');

DROP POLICY IF EXISTS "auth_insert_slideshow_images" ON storage.objects;
CREATE POLICY "auth_insert_slideshow_images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'slideshow-images');

DROP POLICY IF EXISTS "auth_update_slideshow_images" ON storage.objects;
CREATE POLICY "auth_update_slideshow_images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'slideshow-images')
  WITH CHECK (bucket_id = 'slideshow-images');

DROP POLICY IF EXISTS "auth_delete_slideshow_images" ON storage.objects;
CREATE POLICY "auth_delete_slideshow_images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'slideshow-images');
