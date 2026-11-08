/** Pantalla que se muestra cuando todavía no están cargadas las claves de Supabase. */
export default function FaltaConfig() {
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="serif text-3xl">Configuración pendiente</h1>
      <p className="mt-4 text-fg-suave">
        El sitio está instalado, pero le faltan las claves de la base de datos (Supabase).
      </p>
      <ol className="mt-6 list-decimal space-y-3 pl-5 text-fg-suave">
        <li>
          Creá un proyecto gratis en{" "}
          <a className="underline" href="https://supabase.com" target="_blank" rel="noreferrer">
            supabase.com
          </a>{" "}
          y pegá el contenido de <code>supabase/schema.sql</code> en el SQL Editor.
        </li>
        <li>
          Copiá <code>.env.example</code> como <code>.env.local</code> y pegá ahí la URL y la clave
          de servicio del proyecto.
        </li>
        <li>Reiniciá la app: <code>npm run dev</code>.</li>
      </ol>
      <p className="mt-6 text-sm text-muted">
        Los pasos detallados están en el archivo <code>LEEME.md</code>.
      </p>
    </main>
  );
}
