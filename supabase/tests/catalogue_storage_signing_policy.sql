select
  policyname,
  coalesce(qual like '%storage.object.sign%', false) as allows_single_signed_urls,
  coalesce(qual like '%storage.object.sign_many%', false) as allows_batch_signed_urls,
  coalesce(qual not like '%storage.object.list%', false) as denies_object_listing,
  coalesce(qual like '%media.status = ''published''%', false) as requires_published_media
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname = 'published catalogue media can be signed';
