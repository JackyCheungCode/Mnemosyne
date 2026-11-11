alter table public.companies
  add column if not exists verification_status text not null default 'pending'
    check (verification_status in ('pending','verified','rejected')),
  add column if not exists verification_notes text,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid;

create index if not exists companies_verification_status_idx
  on public.companies(verification_status);
