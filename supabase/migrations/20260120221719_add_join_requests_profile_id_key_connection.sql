-- 1) Add profile_id column (nullable for backfill)
alter table public.join_requests
add column if not exists profile_id uuid;

-- 2) Backfill profile_id using existing join_requests.user_id -> profiles.user_id mapping
update public.join_requests jr
set profile_id = p.id
from public.profiles p
where p.user_id = jr.user_id
  and jr.profile_id is null;

-- 3) Add FK constraint so PostgREST can infer relationship join_requests -> profiles
alter table public.join_requests
add constraint join_requests_profile_id_fkey
foreign key (profile_id)
references public.profiles (id)
on delete cascade;

-- 4) Optional: enforce not-null once you are confident everything is backfilled
-- (If you have zero rows right now, this is safe to enable immediately.)
alter table public.join_requests
alter column profile_id set not null;

-- 5) Optional: add index for performance
create index if not exists idx_join_requests_profile_id
on public.join_requests(profile_id);
