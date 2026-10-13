-- Create storage bucket for lesson attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-attachments', 'lesson-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view attachments
CREATE POLICY "Public can view lesson attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'lesson-attachments');

-- Allow admins to upload attachments
CREATE POLICY "Admins can upload lesson attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'lesson-attachments' AND public.is_admin(auth.uid()));

-- Allow admins to update attachments
CREATE POLICY "Admins can update lesson attachments"
ON storage.objects FOR UPDATE
USING (bucket_id = 'lesson-attachments' AND public.is_admin(auth.uid()));

-- Allow admins to delete attachments
CREATE POLICY "Admins can delete lesson attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'lesson-attachments' AND public.is_admin(auth.uid()));