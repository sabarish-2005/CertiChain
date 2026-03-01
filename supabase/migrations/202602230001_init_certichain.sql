-- CertiChain schema
create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role text not null check (role in ('college','company')),
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key,
  name text not null,
  reg_no text unique not null,
  department text not null,
  batch text not null,
  year_of_passing integer not null,
  cgpa numeric(4,2) not null,
  photo jsonb,
  blockchain_hash text not null,
  ipfs_cid text not null,
  verification_id text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.semesters (
  id bigserial primary key,
  student_id uuid references public.students(id) on delete cascade,
  semester_no integer not null,
  subject_name text not null,
  mark integer not null,
  grade text not null
);

create table if not exists public.documents (
  student_id uuid primary key references public.students(id) on delete cascade,
  certificate jsonb,
  sem1_marksheet jsonb,
  sem2_marksheet jsonb,
  sem3_marksheet jsonb,
  sem4_marksheet jsonb,
  sem5_marksheet jsonb,
  sem6_marksheet jsonb
);

alter table public.app_users enable row level security;
alter table public.students enable row level security;
alter table public.semesters enable row level security;
alter table public.documents enable row level security;

create policy "app_users_read" on public.app_users for select to authenticated using (true);
create policy "students_read" on public.students for select to authenticated using (true);
create policy "students_write" on public.students for insert to authenticated with check (true);
create policy "students_update" on public.students for update to authenticated using (true);

create policy "semesters_read" on public.semesters for select to authenticated using (true);
create policy "semesters_write" on public.semesters for insert to authenticated with check (true);
create policy "semesters_delete" on public.semesters for delete to authenticated using (true);

create policy "documents_read" on public.documents for select to authenticated using (true);
create policy "documents_write" on public.documents for insert to authenticated with check (true);
create policy "documents_update" on public.documents for update to authenticated using (true);
