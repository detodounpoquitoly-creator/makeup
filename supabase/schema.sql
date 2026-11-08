-- ══════════════════════════════════════════════════════════════════════════════
-- Sitio de maquillaje: esquema completo.
-- Pegar TODO este archivo en el SQL Editor de Supabase y apretar Run.
-- Ya incluye datos de ejemplo (servicios, horarios y configuración) para usar
-- al toque: todo se puede cambiar después desde el panel de administración.
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── Servicios de maquillaje ─────────────────────────────────────────────────
create table if not exists public.servicios (
  id            serial primary key,
  nombre        text not null,
  duracion_min  int  not null check (duracion_min between 15 and 480),
  precio        numeric(12,2) not null check (precio >= 0),
  sena_monto    numeric(12,2) not null check (sena_monto >= 0),
  imagen        text,
  descripcion   text,
  activo        boolean not null default true,
  orden         int not null default 0
);

-- ─── Agenda: franjas por día de la semana (0 = Domingo … 6 = Sábado) ─────────
create table if not exists public.agenda (
  id     serial primary key,
  dia    int not null check (dia between 0 and 6),
  desde  text not null,          -- "HH:MM"
  hasta  text not null,          -- "HH:MM"
  activo boolean not null default true,
  check (desde < hasta)
);

-- ─── Días bloqueados (feriados, franco, licencias) ───────────────────────────
create table if not exists public.bloqueos (
  id     serial primary key,
  fecha  date not null unique,
  motivo text
);

-- ─── Turnos ──────────────────────────────────────────────────────────────────
-- estado: PENDIENTE (reservado, esperando la seña) → CONFIRMADO (seña cobrada)
--         → VENCIDO (no pagó a tiempo) / CANCELADO.
-- vence_at: cuánto queda bloqueado el horario sin pagar
--           (1 hora al reservar; 12 horas si eligió transferencia).
create table if not exists public.turnos (
  id            serial primary key,
  id_servicio   int not null references public.servicios(id),
  fecha         date not null,
  hora          text not null,   -- "HH:MM"
  fin           text not null,   -- "HH:MM"
  nombre        text not null,
  telefono      text not null,
  instagram     text,
  notas         text,
  estado        text not null default 'PENDIENTE'
                check (estado in ('PENDIENTE','CONFIRMADO','VENCIDO','CANCELADO')),
  sena_monto    numeric(12,2) not null,
  metodo        text,            -- 'MERCADOPAGO' | 'TRANSFERENCIA'
  mp_payment_id text,
  vence_at      timestamptz,
  creado_at     timestamptz not null default now(),
  confirmado_at timestamptz
);
create index if not exists turnos_fecha_idx    on public.turnos (fecha);
create index if not exists turnos_servicio_idx on public.turnos (id_servicio);

-- ─── Avisos por mail (se envían con Resend si está configurado; ──────────────
--     si no, quedan guardados acá y se ven en el Panel → Avisos) ─────────────
create table if not exists public.avisos (
  id        serial primary key,
  tipo      text not null,       -- 'RESERVA_RECIBIDA' | 'TURNO_CONFIRMADO' | 'CANCELADA'
  para      text,                -- email destino
  asunto    text not null,
  cuerpo    text not null,
  estado    text not null default 'PENDIENTE'
            check (estado in ('PENDIENTE','ENVIADO','ERROR')),
  detalle   text,
  creado_at timestamptz not null default now()
);

-- ─── Configuración editable desde el Panel (clave/valor) ────────────────────
create table if not exists public.config (
  clave text primary key,
  valor text
);
insert into public.config (clave, valor) values
  ('telefono_wa', '5491100000000'),
  ('email_admin', 'tu@email.com'),
  ('alias_cbu', 'Ejemplo: Alias MAQUILLAJE.AR - CBU 0000310000000000000000 (cambialo en el Panel)'),
  ('nombre_negocio', 'Maquillaje Profesional'),
  ('instagram', '@tuusuario'),
  ('texto_hero', 'Maquillaje profesional para vos: social, novias, quinceañeras y más. Reservá tu turno en un minuto.'),
  ('texto_sobre_mi', 'Soy maquilladora profesional. Trabajo para que te sientas vos: piel cuidada, natural y con tu estilo. Atiendo a domicilio y en mi estudio.'),
  ('hold_minutos', '60'),
  ('horas_vence_transferencia', '12'),
  ('min_extra', '10')
on conflict (clave) do nothing;

-- ─── Datos de ejemplo: los 5 servicios de la referencia ──────────────────────
-- (Precios y señas de EJEMPLO: editálos en Panel → Servicios.)
insert into public.servicios (nombre, duracion_min, precio, sena_monto, orden, descripcion) values
  ('Maquillaje social',       50, 15000, 5000, 1, 'Piel cuidada y natural para el día a día o eventos informales.'),
  ('Maquillaje de novia',     90, 25000, 8000, 2, 'Prueba previa y maquillaje de larga duración para el gran día.'),
  ('Maquillaje quinceañera',  60, 20000, 6500, 3, 'Look perfecto para tus 15, con el estilo que quieras.'),
  ('Maquillaje madrinas',     60, 20000, 6500, 4, 'Elegante y a medida para acompañar el festejo.'),
  ('Novias por civil',        60, 20000, 6500, 5, 'Maquillaje para la ceremonia civil: fresco, duradero y fotogénico.')
on conflict do nothing;

-- ─── Franjas horarias de ejemplo (editables en Panel → Agenda) ───────────────
insert into public.agenda (dia, desde, hasta) values
  (1, '09:00', '18:00'),
  (2, '09:00', '18:00'),
  (3, '09:00', '18:00'),
  (4, '09:00', '18:00'),
  (5, '09:00', '18:00'),
  (6, '09:00', '13:00')
on conflict do nothing;

-- ─── Seguridad (RLS): la web anónima solo puede LEER servicios, agenda y ─────
--     bloqueos. Turnos, avisos y config se manejan solo desde el servidor
--     con la clave de servicio (nunca quedan expuestos en el navegador).
alter table public.servicios enable row level security;
alter table public.agenda    enable row level security;
alter table public.bloqueos  enable row level security;
alter table public.turnos    enable row level security;
alter table public.avisos    enable row level security;
alter table public.config    enable row level security;

create policy "lectura publica servicios" on public.servicios for select to anon, authenticated using (true);
create policy "lectura publica agenda"    on public.agenda    for select to anon, authenticated using (true);
create policy "lectura publica bloqueos"  on public.bloqueos  for select to anon, authenticated using (true);
