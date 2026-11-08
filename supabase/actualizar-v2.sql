-- ══════════════════════════════════════════════════════════════════════════════
-- v2: categorías de servicios + textos de la marca Sofy (como la demo).
-- Correr en Supabase → SQL Editor DESPUÉS de schema.sql y datos-sofy.sql.
-- Idempotente: se puede correr más de una vez sin romper nada.
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── Categorías (iguales a las de la demo) ────────────────────────────────────
create table if not exists public.categorias (
  id    serial primary key,
  nombre text not null,
  tag   text not null,
  orden int not null default 0
);

insert into public.categorias (nombre, tag, orden) values
  ('Maquillaje',     'Looks impecables para cada ocasión',        1),
  ('Cejas',          'Diseño y arquitectura de tu mirada',        2),
  ('Pestañas',       'Miradas que hablan solas',                  3),
  ('Promo Combo',    'Combos de belleza al mejor precio',         4),
  ('Asesoramientos', 'Aprendé a realzar tu belleza',              5),
  ('Cursos',         'Formación profesional',                     6)
on conflict do nothing;

-- ─── Cada servicio pertenece a una categoría ─────────────────────────────────
alter table public.servicios add column if not exists categoria_id int references public.categorias (id);

-- Código de reserva visible para la clienta (SM-1001, SM-1002, …)
alter table public.turnos add column if not exists codigo text unique;

-- Actualizar turnos ya creados sin código (por si hubo reservas antes).
update public.turnos set codigo = 'SM-' || (1000 + id) where codigo is null;
create index if not exists turnos_codigo_idx on public.turnos (codigo);

-- ─── Asignar categoría a los 25 servicios (por nombre, como la demo) ─────────
update public.servicios s
   set categoria_id = c.id
  from public.categorias c
 where (c.nombre = 'Maquillaje'     and s.nombre in ('Maquillaje social','Maquillaje de novia','Maquillaje quinceañera','Maquillaje madrinas','Novias por civil','Maquillaje egresadas','Pruebas'))
    or (c.nombre = 'Cejas'          and s.nombre in ('Perfilado de cejas con cera','Diseño de cejas','Laminado de cejas','Baño de henna','Brow lamination + tinte','Retoque de diseño','Depilación con pinza','Tinte de cejas','Mapping + cera + tinte'))
    or (c.nombre = 'Pestañas'       and s.nombre in ('Extensiones clásicas','Volumen ruso','Lifting de pestañas'))
    or (c.nombre = 'Promo Combo'    and s.nombre in ('Make up + Perfilado de cejas','Make up + Lifting de pestañas','Combo Novia: prueba + make'))
    or (c.nombre = 'Asesoramientos' and s.nombre in ('Asesoramiento de belleza'))
    or (c.nombre = 'Cursos'         and s.nombre in ('Curso de automaquillaje','Curso intensivo profesional'));

-- ─── Textos de la marca (portada, estudio, sobre mí) ──────────────────────────
insert into public.config (clave, valor) values
  ('marca', 'Sofy'),
  ('marca_sufijo', 'MAKEUP'),
  ('kicker', 'MAQUILLADORA PROFESIONAL · BUENOS AIRES'),
  ('hero_titulo', 'Belleza que'),
  ('hero_acento', 'se siente propia'),
  ('hero_texto', 'Looks de novia, social y quinceañeras. Cejas y pestañas que realzan tu mirada. Reservá tu turno online en menos de un minuto.'),
  ('hero_tag', 'LOOK NOVIA · 2026'),
  ('sobre_titulo', 'Hola, soy Sofy'),
  ('sobre_p1', 'Llevo más de 8 años maquillando rostros reales: novias nerviosas, quinceañeras ansiosas, madrinas elegantes y egresadas que quieren durar doce horas en la pista.'),
  ('sobre_p2', 'Mi estilo es limpio y sofisticado: piel luminosa, mirada protagonista y labios que se sienten propios. Trabajo con productos de alta gama y mi estudio está en Palermo, con la mejor luz natural para que veas tu look tal como es.'),
  ('sobre_stats', '+150 novias|+800 looks sociales|8 años de oficio'),
  ('estudio_direccion', 'Gorriti 4521, Palermo · CABA'),
  ('estudio_horarios', 'Lunes a sábados de 9 a 19 h'),
  ('estudio_nota', 'Con turno previo')
on conflict (clave) do update set valor = excluded.valor;
