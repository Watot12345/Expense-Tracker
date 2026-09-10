-- Migration: Create private storage bucket for receipts with 30-day lifecycle auto-delete and RLS

-- Add receipt_url column to expenses table if it doesn't already exist
alter table expenses add column if not exists receipt_url text;

-- Create private receipts bucket (path pattern: receipts/{user_id}/{expense_id}.jpg)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  10485760, -- 10MB limit
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

-- Enable RLS on storage.objects (Supabase standard)
-- Policy: Allow users to upload receipts to their own user_id directory
create policy "Users can upload their own receipts"
  on storage.objects for insert
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Allow users to view/download their own receipts
create policy "Users can view their own receipts"
  on storage.objects for select
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Allow users to update their own receipts
create policy "Users can update their own receipts"
  on storage.objects for update
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Allow users to delete their own receipts
create policy "Users can delete their own receipts"
  on storage.objects for delete
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 30-day lifecycle/expiry cleanup cron (auto-delete receipts older than 30 days)
-- Runs nightly at 03:00 UTC via pg_cron if available
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'purge-expired-receipts-30d',
      '0 3 * * *',
      $cron$
        delete from storage.objects
        where bucket_id = 'receipts'
          and created_at < now() - interval '30 days';
      $cron$
    );
  end if;
end $$;
