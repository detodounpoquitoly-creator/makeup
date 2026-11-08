-- ══════════════════════════════════════════════════════════════════════════════
-- Datos reales de Sofy MakeUp (tomados de la demo publicada).
-- Correr DESPUÉS de schema.sql, en el mismo SQL Editor de Supabase.
--
-- ⚠ Solo para una base recién creada: reemplaza TODOS los servicios.
--   Si ya hay turnos cargados, avisá antes de correrlo (el borrado fallaría).
--
-- La seña es el 30% del precio, igual que en la demo.
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── Configuración con los datos de la marca ────────────────────────────────
-- ⚠ telefono_wa, email_admin y alias_cbu vienen de la demo (ejemplo):
--   reemplazalos por los reales en Panel → Config.
insert into public.config (clave, valor) values
  ('nombre_negocio', 'Sofy MakeUp'),
  ('instagram', 'sofy.makeup'),
  ('telefono_wa', '5491123456789'),
  ('email_admin', 'hola@sofymakeup.com'),
  ('texto_hero', 'Belleza que se siente propia. Looks de novia, social y quinceañeras. Cejas y pestañas que realzan tu mirada.'),
  ('texto_sobre_mi', 'Llevo más de 8 años maquillando rostros reales: novias nerviosas, quinceañeras ansiosas, madrinas elegantes y egresadas que quieren durar doce horas en la pista. Mi estilo es limpio y sofisticado: piel luminosa, mirada protagonista y labios que se sienten propios. Trabajo con productos de alta gama y mi estudio está en Palermo, con la mejor luz natural.')
on conflict (clave) do update set valor = excluded.valor;

-- ─── Catálogo real (reemplaza los datos de ejemplo) ──────────────────────────
delete from public.servicios;

insert into public.servicios (nombre, duracion_min, precio, sena_monto, orden, descripcion) values
  -- Maquillaje
  ('Maquillaje social',            60,  22000,  6600,  1, 'Make up de larga duración para eventos, cenas y salidas. Incluye preparación de piel, ojos según tu look y labios. Pestañas de regalo.'),
  ('Maquillaje de novia',          90,  48000, 14400,  2, 'El look más importante de tu vida. Incluye prueba previa, maquillaje de larga duración HD, pestañas a medida y retoque el día del evento.'),
  ('Maquillaje quinceañera',       75,  32000,  9600,  3, 'Maquillaje fresco y luminoso pensado para fotos y pista de baile. Pestañas a medida incluidas.'),
  ('Maquillaje madrinas',          50,  20000,  6000,  4, 'Elegancia y durabilidad para acompañar a los novios sin robar protagonismo. Pestañas de regalo.'),
  ('Novias por civil',             45,  26000,  7800,  5, 'Maquillaje natural y sofisticado para bodas íntimas y civil. Pestañas de regalo.'),
  ('Maquillaje egresadas',         60,  24000,  7200,  6, 'Look a prueba de baile: sellado total, ojos elegidos a medida y labios de larga duración.'),
  ('Pruebas',                      90,  15000,  4500,  7, 'Sesión de prueba para novias, quinceañeras o quien tenga un evento importante: probamos distintos looks hasta encontrar el perfecto.'),
  -- Cejas
  ('Perfilado de cejas con cera',  20,   6000,  1800,  8, 'Limpieza y diseño con cera para un rostro más definido.'),
  ('Diseño de cejas',              20,   5500,  1700,  9, 'Estudio de tu rostro para encontrar la forma ideal de tus cejas.'),
  ('Laminado de cejas',            45,  12000,  3600, 10, 'Efecto peine upward: cejas más pobladas, fijadas y ordenadas por semanas.'),
  ('Baño de henna',                30,   8000,  2400, 11, 'Color y volumen temporal con henna vegetal, ideal para rellenar huecos.'),
  ('Brow lamination + tinte',      50,  14000,  4200, 12, 'El combo favorito: lamination fija, el tinte densifica.'),
  ('Retoque de diseño',            15,   4500,  1400, 13, 'Mantenimiento quincenal de tu diseño habitual.'),
  ('Depilación con pinza',         20,   5000,  1500, 14, 'Perfilado fino y delicado pelito a pelito.'),
  ('Tinte de cejas',               20,   6500,  2000, 15, 'Color a medida para intensificar tu mirada.'),
  ('Mapping + cera + tinte',       60,  16000,  4800, 16, 'Sesión completa de arquitectura de cejas con mapa personalizado.'),
  -- Pestañas
  ('Extensiones clásicas',         90,  16000,  4800, 17, 'Una extensión por pestaña natural: efecto rímel perfecto, natural y elegante.'),
  ('Volumen ruso',                120,  22000,  6600, 18, 'Abanicos hechos a mano para un efecto intenso y glamoroso.'),
  ('Lifting de pestañas',          45,  11000,  3300, 19, 'Curva y tinta tu pestaña natural sin extensiones, con efecto durable.'),
  -- Promos combos
  ('Make up + Perfilado de cejas', 80,  25000,  7500, 20, 'Mirada y rostro impecables en una sola visita.'),
  ('Make up + Lifting de pestañas',105, 30000,  9000, 21, 'Ojos listos para el evento y para las semanas después.'),
  ('Combo Novia: prueba + make',  180,  58000, 17400, 22, 'Prueba previa + maquillaje del día con pestañas incluidas. El combo más pedido.'),
  -- Asesoramientos y cursos
  ('Asesoramiento de belleza',     60,  12000,  3600, 23, 'Análisis de piel, paleta de colores, rutina y productos indicados para vos. Salís con una guía propia.'),
  ('Curso de automaquillaje',     180,  45000, 13500, 24, 'Aprendé a maquillarte como profesional: bases, ojos, correctores y tu rutina ideal. Incluye kit de inicio.'),
  ('Curso intensivo profesional', 480, 120000, 36000, 25, 'Formación completa: pieles, social, novias, tendencias y práctica con modelo. Certificación incluida.');
