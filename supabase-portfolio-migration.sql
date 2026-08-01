-- Run once in Supabase SQL Editor before using project categories.
alter table public.submissions add column if not exists project text not null default 'ARCHIVE';
alter table public.submissions alter column project drop default;
