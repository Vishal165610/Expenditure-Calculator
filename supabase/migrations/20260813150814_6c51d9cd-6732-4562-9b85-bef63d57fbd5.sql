CREATE POLICY "receipts_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'receipts');
CREATE POLICY "receipts_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'receipts');
CREATE POLICY "receipts_delete_own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'receipts' AND owner = auth.uid());