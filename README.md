# ReviewDesk

ReviewDesk è un'applicazione web per la gestione delle recensioni Google e delle richieste SMS per piccoli esercenti.

## Configurazione

Copia `.env.example` in `.env` e configura le seguenti variabili:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAILS`
- `SERPKITE_API_KEY`
- `TOMTOM_API_KEY`

## Database & RLS SQL

Esegui questo script SQL nel tuo progetto Supabase per configurare tabelle e politiche RLS:

```sql
-- Tabella Businesses
create table if not exists businesses (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  category text,
  location text,
  signer_name text,
  tone text,
  default_language text,
  phrases_to_avoid text,
  private_contact text,
  google_url text,
  is_connected boolean default false,
  sms_template text,
  google_place_id text,
  google_account_id text,
  google_location_id text,
  -- google_api_key text, -- MODIFICATO: rimosso
  sync_frequency text,
  auto_sync_reviews boolean default true,
  last_sync_at text
);

-- Tabella Reviews
create table if not exists reviews (
  id text primary key,
  business_id text references businesses(id) on delete cascade not null,
  author text not null,
  stars integer not null,
  text text,
  date text,
  status text not null,
  reply_text text,
  reply_date text,
  draft_text text
);

-- Tabella Requests
create table if not exists requests (
  id text primary key,
  business_id text references businesses(id) on delete cascade not null,
  client_name text not null,
  phone text,
  date text,
  status text not null,
  text text,
  consent boolean default false,
  consent_at text
);

-- Tabella Pilot Requests (accessibile solo via service role)
create table if not exists pilot_requests (
  id text primary key,
  name text not null,
  business_name text not null,
  business_type text,
  email text not null,
  status text not null,
  created_at text not null,
  notes text
);

-- Tabella App Settings (accessibile solo via service role)
create table if not exists app_settings (
  key text primary key,
  value jsonb not null
);

-- Abilitazione RLS
alter table businesses enable row level security;
alter table reviews enable row level security;
alter table requests enable row level security;
alter table pilot_requests enable row level security;
alter table app_settings enable row level security;

-- Politiche RLS per businesses
create policy "Users can access own businesses"
  on businesses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Politiche RLS per reviews (tramite business_id)
create policy "Users can access reviews of own businesses"
  on reviews for all
  using (
    exists (
      select 1 from businesses
      where businesses.id = reviews.business_id
      and businesses.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from businesses
      where businesses.id = reviews.business_id
      and businesses.user_id = auth.uid()
    )
  );

## Sincronizzazione Recensioni (SerpKite)
L'applicazione utilizza ora l'API SerpKite:
- **Sincronizzazione**: Gestita tramite **SerpKite** (/v1/places e /v1/reviews).
- **Geolocalizzazione**: Gestita tramite **Nominatim (OpenStreetMap)** / **TomTom**.
- **Configurazione**: È richiesta la chiave `SERPKITE_API_KEY`.
- **Cache**: La sincronizzazione è limitata a una volta ogni 30 minuti per business (bypassabile con `force: true` da UI).
-- Politiche RLS per requests (tramite business_id)
create policy "Users can access requests of own businesses"
  on requests for all
  using (
    exists (
      select 1 from businesses
      where businesses.id = requests.business_id
      and businesses.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from businesses
      where businesses.id = requests.business_id
      and businesses.user_id = auth.uid()
    )
  );

-- pilot_requests e app_settings senza policy per utenti autentici/anonimi (accessibili solo via service role admin)
```

## Sviluppo e Avvio

- `npm run dev`: Avvia il server di sviluppo con Vite.
- `npm run build`: Compila l'applicazione per la produzione.
- `npm start`: Avvia il server in produzione.
- `npm run lint`: Esegue il controllo TypeScript.
