create or replace function public.poll_channel_readable(_poll_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_polls p
    join public.chat_messages m on m.id = p.message_id
    where p.id = _poll_id
      and public.can_read_channel(m.channel, auth.uid())
  )
$$;

revoke all on function public.poll_channel_readable(uuid) from public, anon;
grant execute on function public.poll_channel_readable(uuid) to authenticated;

drop policy if exists "Authenticated users can view polls" on public.chat_polls;
create policy "Channel members can view polls"
on public.chat_polls for select to authenticated
using (public.poll_channel_readable(id));

drop policy if exists "Authenticated users can create polls" on public.chat_polls;
create policy "Channel members can create polls"
on public.chat_polls for insert to authenticated
with check (
  auth.uid() = created_by
  and exists (
    select 1 from public.chat_messages m
    where m.id = message_id and public.can_read_channel(m.channel, auth.uid())
  )
);

drop policy if exists "Authenticated users can view votes" on public.chat_poll_votes;
create policy "Channel members can view votes"
on public.chat_poll_votes for select to authenticated
using (public.poll_channel_readable(poll_id));

drop policy if exists "Users can vote" on public.chat_poll_votes;
create policy "Channel members can vote"
on public.chat_poll_votes for insert to authenticated
with check (auth.uid() = user_id and public.poll_channel_readable(poll_id));

drop policy if exists "Users can change vote" on public.chat_poll_votes;
create policy "Users can change own vote"
on public.chat_poll_votes for update to authenticated
using (auth.uid() = user_id and public.poll_channel_readable(poll_id))
with check (auth.uid() = user_id);