-- =====================================================
-- Migración: Crear tabla laboratories (Multi-tenant SaaS)
-- Fecha: 2025-10-24
-- Fase: 1.1 del plan de migración a Multi-tenant
-- Descripción: Tabla maestra de laboratorios para arquitectura multi-tenant
-- =====================================================

-- Crear tabla laboratories
create table if not exists public.laboratories (
  id uuid primary key default gen_random_uuid(),
  
  -- Identificadores
  slug text unique not null, -- 'conspat', 'labvargas', etc (usado para subdominios futuros)
  name text not null, -- 'Conspat', 'Laboratorio Vargas'
  
  -- Estado del laboratorio
  status text default 'active' check (status in ('active', 'inactive', 'trial')),
  
  -- Configuración de features habilitadas por laboratorio
  features jsonb default '{
    "hasInmunoRequests": true,
    "hasChangelogModule": true,
    "hasChatAI": true,
    "hasMultipleBranches": true,
    "hasCitologyStatus": true,
    "hasPatientOriginFilter": true,
    "hasRobotTracking": false
  }'::jsonb,
  
  -- Branding personalizado por laboratorio
  branding jsonb default '{
    "logo": null,
    "primaryColor": "#0066cc",
    "secondaryColor": "#00cc66"
  }'::jsonb,
  
  -- Configuración específica del laboratorio
  config jsonb default '{
    "branches": ["Principal"],
    "paymentMethods": ["Efectivo", "Zelle", "Pago Móvil", "Transferencia"],
    "defaultExchangeRate": 36.5,
    "timezone": "America/Caracas",
    "autoSendEmailsOnApproval": true,
    "requiresApproval": true,
    "allowsDigitalSignature": false
  }'::jsonb,
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =====================================================
-- Índices para optimización
-- =====================================================

-- Índice para búsquedas por slug (usado en subdominios y URLs)
create index if not exists idx_laboratories_slug on public.laboratories(slug);

-- Índice para filtrar laboratorios por estado
create index if not exists idx_laboratories_status on public.laboratories(status);

-- =====================================================
-- Habilitar Row Level Security (RLS)
-- =====================================================

alter table public.laboratories enable row level security;

-- =====================================================
-- RLS Policies
-- =====================================================

-- Policy: Todos pueden leer laboratorios activos
-- (Útil para página de login donde se muestra el logo del laboratorio)
create policy "Anyone can view active laboratories"
  on public.laboratories
  for select
  using (status = 'active');

-- Policy: Solo usuarios con rol 'owner' pueden insertar laboratorios
create policy "Only owners can insert laboratories"
  on public.laboratories
  for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'owner'
    )
  );

-- Policy: Solo usuarios con rol 'owner' pueden actualizar laboratorios
create policy "Only owners can update laboratories"
  on public.laboratories
  for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'owner'
    )
  );

-- Policy: Solo usuarios con rol 'owner' pueden eliminar laboratorios
create policy "Only owners can delete laboratories"
  on public.laboratories
  for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'owner'
    )
  );

-- =====================================================
-- Trigger para actualizar updated_at automáticamente
-- =====================================================

create or replace function public.update_laboratories_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trigger_update_laboratories_updated_at
  before update on public.laboratories
  for each row
  execute function public.update_laboratories_updated_at();

-- =====================================================
-- Comentarios para documentación
-- =====================================================

comment on table public.laboratories is 
  'Tabla maestra de laboratorios para arquitectura multi-tenant. Cada laboratorio tiene su propia configuración de features, branding y settings.';

comment on column public.laboratories.slug is 
  'Identificador único en formato slug (ej: conspat, labvargas). Usado para subdominios futuros.';

comment on column public.laboratories.features is 
  'Configuración JSON de features habilitadas/deshabilitadas por laboratorio.';

comment on column public.laboratories.branding is 
  'Configuración JSON de branding personalizado (logo, colores) por laboratorio.';

comment on column public.laboratories.config is 
  'Configuración JSON específica del laboratorio (sucursales, métodos de pago, tasa de cambio, etc).';

-- =====================================================
-- Validaciones adicionales
-- =====================================================

-- Validar que el slug no contenga espacios ni caracteres especiales (solo lowercase, números y guiones)
alter table public.laboratories
  add constraint slug_format_check 
  check (slug ~ '^[a-z0-9-]+$');

-- Validar que el nombre no esté vacío
alter table public.laboratories
  add constraint name_not_empty_check
  check (length(trim(name)) > 0);

-- =====================================================
-- Grants de permisos
-- =====================================================

-- Permitir SELECT a usuarios autenticados
grant select on public.laboratories to authenticated;

-- Permitir INSERT, UPDATE, DELETE solo a través de RLS policies
grant insert, update, delete on public.laboratories to authenticated;

-- =====================================================
-- Fin de la migración
-- =====================================================

