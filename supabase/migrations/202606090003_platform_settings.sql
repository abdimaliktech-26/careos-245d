-- Platform settings key-value store for super-admin config
create table if not exists platform_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

alter table platform_settings enable row level security;

-- Only super_admin can read/write (checked in app code)
create policy "Super admin access" on platform_settings
  for all using (true);

-- Seed default values
insert into platform_settings (key, value) values
  ('stripe_starter_price_amount', '9900'),
  ('stripe_pro_price_amount', '24900'),
  ('stripe_enterprise_price_amount', '49900');
