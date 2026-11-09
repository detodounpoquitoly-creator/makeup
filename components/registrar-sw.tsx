"use client";

import { useEffect } from "react";

/** Registra el service worker solo en producción (en dev cachearía de más). */
export default function RegistrarSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const listo = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") listo();
    else window.addEventListener("load", listo, { once: true });
    return () => window.removeEventListener("load", listo);
  }, []);

  return null;
}
