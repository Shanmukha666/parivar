alter table public.staff_roles drop constraint if exists staff_roles_language_check;
alter table public.staff_roles add constraint staff_roles_language_check
  check (language in ('en', 'hi', 'te', 'ta'));

alter table public.sessions drop constraint if exists sessions_lang_check;
alter table public.sessions add constraint sessions_lang_check
  check (lang in ('en', 'hi', 'te', 'ta'));

alter table public.messages drop constraint if exists messages_lang_check;
alter table public.messages add constraint messages_lang_check
  check (lang in ('en', 'hi', 'te', 'ta'));
