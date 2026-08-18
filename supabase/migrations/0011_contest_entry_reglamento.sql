-- register_contest_entry(): guarda que el participante aceptó el
-- reglamento, igual que hacen los expositores. Cambia la firma, así que
-- primero se borra la versión anterior.

drop function if exists register_contest_entry(uuid, text, text, text, jsonb);

create or replace function register_contest_entry(
  p_contest_id uuid,
  p_participant_name text,
  p_phone text,
  p_email text,
  p_answers jsonb,
  p_reglamento_accepted boolean
) returns contest_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contest contests%rowtype;
  v_entry contest_entries%rowtype;
  v_today date := (now() at time zone 'America/Monterrey')::date;
begin
  if not p_reglamento_accepted then
    raise exception 'REGLAMENTO_NOT_ACCEPTED' using errcode = 'P0001';
  end if;

  select * into v_contest from contests where id = p_contest_id for update;

  if not found then
    raise exception 'CONTEST_NOT_FOUND' using errcode = 'P0001';
  end if;

  if not v_contest.is_open then
    raise exception 'CONTEST_CLOSED' using errcode = 'P0001';
  end if;

  if v_contest.registration_deadline is not null
     and v_today > v_contest.registration_deadline then
    raise exception 'CONTEST_DEADLINE_PASSED' using errcode = 'P0001';
  end if;

  if v_contest.max_entries is not null
     and v_contest.entries_count >= v_contest.max_entries then
    raise exception 'CONTEST_FULL' using errcode = 'P0001';
  end if;

  insert into contest_entries (
    contest_id, event_id, participant_name, phone, email, answers,
    reglamento_accepted, reglamento_accepted_at
  ) values (
    p_contest_id, v_contest.event_id, p_participant_name, p_phone,
    p_email, coalesce(p_answers, '{}'::jsonb), true, now()
  ) returning * into v_entry;

  return v_entry;
end;
$$;

revoke all on function register_contest_entry(uuid, text, text, text, jsonb, boolean) from public;
grant execute on function register_contest_entry(uuid, text, text, text, jsonb, boolean)
  to anon, authenticated;
