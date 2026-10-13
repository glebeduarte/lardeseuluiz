-- Create storage bucket for course assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-assets', 'course-assets', true);

-- Allow authenticated users to view course assets
CREATE POLICY "Anyone can view course assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-assets');

-- Allow admins to upload course assets
CREATE POLICY "Admins can upload course assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'course-assets' AND public.is_admin(auth.uid()));

-- Allow admins to update course assets
CREATE POLICY "Admins can update course assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'course-assets' AND public.is_admin(auth.uid()));

-- Allow admins to delete course assets
CREATE POLICY "Admins can delete course assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'course-assets' AND public.is_admin(auth.uid()));