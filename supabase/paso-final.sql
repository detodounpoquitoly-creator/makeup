-- ══════════════════════════════════════════════════════════════════════════════
-- PASO FINAL: permisos de lectura + datos completos.
-- Correr en Supabase → SQL Editor → https://supabase.com/dashboard/project/bqupegyphsoerrpjinqu/sql/new
-- Idempotente: se puede correr más de una vez sin romper nada.
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Permitir que la web lea (y el sitio gestione) las tablas ──────────────
-- (la web usa la llave pública, así que necesitamos políticas abiertas)

do $$
declare t text;
begin
  foreach t in array array['servicios','categorias','config','agenda','bloqueos','avisos','turnos']
  loop
    execute format('drop policy if exists "web abierta" on public.%I', t);
    execute format('create policy "web abierta" on public.%I for all using (true) with check (true)', t);
  end loop;
end $$;

-- ─── 2. Categorías (si faltan) ────────────────────────────────────────────────
insert into public.categorias (nombre, tag, orden)
select v.nombre, v.tag, v.orden
from (values
  ('Maquillaje',     'Looks impecables para cada ocasión', 1),
  ('Cejas',          'Diseño y arquitectura de tu mirada', 2),
  ('Pestañas',       'Miradas que hablan solas',           3),
  ('Promo Combo',    'Combos de belleza al mejor precio',  4),
  ('Asesoramientos', 'Aprendé a realzar tu belleza',       5),
  ('Cursos',         'Formación profesional',              6)
) as v(nombre, tag, orden)
where not exists (select 1 from public.categorias c where c.nombre = v.nombre);

-- ─── 3. Cada servicio en su categoría ────────────────────────────────────────
update public.servicios s
   set categoria_id = c.id
  from public.categorias c
 where (c.nombre = 'Maquillaje'     and s.nombre in ('Maquillaje social','Maquillaje de novia','Maquillaje quinceañera','Maquillaje madrinas','Novias por civil','Maquillaje egresadas','Pruebas'))
    or (c.nombre = 'Cejas'          and s.nombre in ('Perfilado de cejas con cera','Diseño de cejas','Laminado de cejas','Baño de henna','Brow lamination + tinte','Retoque de diseño','Depilación con pinza','Tinte de cejas','Mapping + cera + tinte'))
    or (c.nombre = 'Pestañas'       and s.nombre in ('Extensiones clásicas','Volumen ruso','Lifting de pestañas'))
    or (c.nombre = 'Promo Combo'    and s.nombre in ('Make up + Perfilado de cejas','Make up + Lifting de pestañas','Combo Novia: prueba + make'))
    or (c.nombre = 'Asesoramientos' and s.nombre in ('Asesoramiento de belleza'))
    or (c.nombre = 'Cursos'         and s.nombre in ('Curso de automaquillaje','Curso intensivo profesional'));

-- ─── 4. Textos de la marca (si faltan) ────────────────────────────────────────
insert into public.config (clave, valor)
select v.clave, v.valor
from (values
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
  ('estudio_nota', 'Con turno previo'),
  ('telefono_wa', '5491100000000'),
  ('alias_cbu', 'Tu alias o CBU acá')
) as v(clave, valor)
where not exists (select 1 from public.config c where c.clave = v.clave);

-- ─── 5. Código de reserva SM-XXXX en los turnos ──────────────────────────────
alter table public.turnos add column if not exists codigo text;
update public.turnos set codigo = 'SM-' || (1000 + id) where codigo is null;
create index if not exists turnos_codigo_idx on public.turnos (codigo);
