create table if not exists public.stage0_smoke (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  created_at timestamptz not null default now()
);

alter table public.stage0_smoke enable row level security;

revoke all on table public.stage0_smoke from anon, authenticated;
grant select on table public.stage0_smoke to anon, authenticated;

create policy "stage0 smoke rows are readable"
  on public.stage0_smoke
  for select
  to anon, authenticated
  using (true);
