create or replace function public.list_staff_members_with_email()
returns table (
  email text,
  role text,
  is_active boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $function$
  select auth_user.email::text, member.role::text, member.is_active, member.created_at
  from public.staff_members as member
  join auth.users as auth_user on auth_user.id = member.user_id
  where public.has_admin_role(array['owner'])
  order by lower(auth_user.email)
$function$;

create or replace function public.manage_staff_member_by_email(
  p_email text,
  p_role text,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  normalized_email text := lower(trim(coalesce(p_email, '')));
  target_user_id uuid;
  matching_accounts bigint;
begin
  if not public.has_admin_role(array['owner']) then
    raise exception 'Owner privilege required' using errcode = '42501';
  end if;
  if normalized_email = '' or length(normalized_email) > 254 then
    raise exception 'A valid staff email is required' using errcode = '22023';
  end if;

  select count(*) into matching_accounts
  from auth.users as auth_user
  where lower(auth_user.email) = normalized_email;

  if matching_accounts = 0 then
    raise exception 'Auth account not found' using errcode = 'P0002';
  end if;
  if matching_accounts > 1 then
    raise exception 'Email matches more than one Auth account' using errcode = '22023';
  end if;

  select auth_user.id into target_user_id
  from auth.users as auth_user
  where lower(auth_user.email) = normalized_email;

  perform public.manage_staff_member(target_user_id, p_role, p_is_active);
end;
$function$;

create or replace function public.get_admin_actor_emails(p_user_ids uuid[])
returns table (user_id uuid, email text)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if not public.has_admin_role(array['owner', 'staff']) then
    raise exception 'Insufficient privilege' using errcode = '42501';
  end if;

  return query
  select member.user_id, auth_user.email::text
  from public.staff_members as member
  join auth.users as auth_user on auth_user.id = member.user_id
  where member.user_id = any(coalesce(p_user_ids, array[]::uuid[]));
end;
$function$;

revoke all on function public.list_staff_members_with_email() from public, anon;
revoke all on function public.manage_staff_member_by_email(text, text, boolean) from public, anon;
revoke all on function public.get_admin_actor_emails(uuid[]) from public, anon;
grant execute on function public.list_staff_members_with_email() to authenticated;
grant execute on function public.manage_staff_member_by_email(text, text, boolean) to authenticated;
grant execute on function public.get_admin_actor_emails(uuid[]) to authenticated;
