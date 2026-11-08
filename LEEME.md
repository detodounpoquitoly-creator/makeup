# Makup Web — Sitio de maquillaje con reserva de turnos

Aplicación completa (Next.js + Supabase + Mercado Pago opcional) para que tus clientas:

1. Entren desde el **link de Instagram** a la página pública (`/`): servicios con precio y duración,
   sobre mí, trabajos, contacto y botón de WhatsApp.
   (La versión demo anterior también sigue disponible en `/demo.html`)
2. Reserven turno (`/reservar`): eligen servicio → calendario del mes (días con lugares) → horario
   disponible → sus datos. Al confirmar, **el horario queda bloqueado por 1 hora** para completar el pago.
3. Paguen la **seña**:
   - **Mercado Pago** (si cargás tu token): se confirma *automáticamente* cuando entra el pago (webhook).
   - **Transferencia**: se muestra tu alias/CBU; el turno queda *pendiente* y lo confirmás vos desde el
     panel cuando llega la transferencia (tiene 12 horas de gracia).
4. Reciban estado (`/reserva/123`): pendiente, confirmado ✓, vencido o cancelado, con botón de
   "Avisar por WhatsApp".

Y para vos, el **panel de administración** (`/admin`, contraseña `maquillaje2026`, cambiable en
`ADMIN_PASSWORD`): turnos por día con confirmación manual, servicios (precios, señas, duración,
fotos), agenda semanal, bloqueo de fechas, configuración (WhatsApp, email, alias, textos) y
listado de avisos de mail.

---

## Puesta en marcha (una sola vez, ~10 minutos)

1. **Supabase** — entrá a [supabase.com](https://supabase.com) con tu cuenta:
   - Creá un proyecto nuevo (llamalo por ejemplo `makup`).
   - En el menú → *SQL Editor*: pegá **todo** el contenido de `supabase/schema.sql` y apretá *Run*.
   - (Opcional) Pegá también `supabase/datos-sofy.sql` y *Run*: carga el catálogo real de Sofy
     (precios, señas 30% y textos de la marca), reemplazando los datos de ejemplo.
   - En *Project Settings → API*: copiá la `Project URL` y la `service_role key`.
2. **Claves en la app** — copiá `.env.example` como `.env.local` y pegá:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...tu Project URL...
   SUPABASE_SERVICE_ROLE_KEY=...tu service_role key...
   ```
3. **Probar en tu compu**: `npm run dev` → abrí `http://localhost:3000`.
4. **Publicar en internet (Vercel, gratis)**:
   - Subí esta carpeta a un repo de GitHub e importala en [vercel.com](https://vercel.com).
   - En *Settings → Environment Variables* cargá las mismas claves + `ADMIN_PASSWORD`
     (con la contraseña que quieras) y `ORIGEN` con la dirección final (ej: `https://tusitio.vercel.app`).
   - Cuando Vercel te dé el link, **ese es el link para el bio de Instagram**.

## Opcional (activar después, no hacen falta para arrancar)

- **Mercado Pago automático**: en [mercadopago.com](https://mercadopago.com) → *Tus integraciones
  → Aplicación → Producción* (tipo "checkout"): copiá el token y cargalo como `MP_ACCESS_TOKEN`.
  El webhook ya viene conectado (`/api/pago/webhook`) en la preferencia.
- **Mails reales**: creá una cuenta en [resend.com](https://resend.com), copiá su API key como
  `RESEND_API_KEY`. Mientras no esté, todos los avisos quedan guardados y se ven en
  el panel (`/admin → Avisos`), así no se pierde nada.
- **Fotos**: poné tus imágenes en `public/fotos/` (ej.: `public/fotos/novia.jpg`) y en el panel
  → *Servicios* escribí la ruta (`/fotos/novia.jpg`) en el campo Imagen.

## Datos a completar desde el panel (5 minutos)

 estados de ejemplo precargados — cambialos en *Panel*:

- *Config*: tu **número de WhatsApp** (ej: `5491122334455`), tu **email**, **alias/CBU** real,
  nombre del negocio, Instagram y los textos.
- *Servicios*: poné tus **precios y señas reales** (los de ejemplo son editables).
- *Agenda*: tus días y horarios de atención (por defecto: lunes a viernes 9–18, sábado 9–13).
- *Bloqueos*: fechas sin atención (feriados, franco).

## Cómo funciona por dentro (resumen técnico)

- `supabase/schema.sql`: tablas `servicios`, `agenda`, `bloqueos`, `turnos`, `avisos`, `config`
  (RLS: la web anónima solo lee lo público; el resto va por el servidor).
- Disponibilidad: `app/api/disponibilidad` genera horarios con duración del servicio + recambio
  (+10 min por defecto), descuenta turnos tomados y respeta bloqueos/feriados.
- Turnos: `app/api/turnos` re-valida en el servidor (nunca confía en el navegador), crea la reserva
  con estado `PENDIENTE` y vencimiento (`vence_at`).
- Pago: `app/api/pago/mercadopago` crea la preferencia con el monto **siempre desde la base**;
  `app/api/pago/webhook` confirma el turno cuando MP avisa el pago aprobado.
- `app/api/admin/*`: login con cookie HttpOnly (HMAC de la contraseña) y operaciones del panel.
