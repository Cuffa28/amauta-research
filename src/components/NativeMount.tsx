"use client";

import { useEffect, useRef } from "react";

/**
 * Monta un módulo "nativo" legacy (cedears.js / news.js) que expone
 * window[globalName] = { mount(el), unmount() }. Carga el script una vez
 * y monta/desmonta al entrar/salir de la ruta.
 */
export default function NativeMount({
  src,
  globalName,
}: {
  src: string;
  globalName: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;

    const doMount = () => {
      if (!active || !ref.current) return;
      const view = w[globalName];
      if (view?.mount) {
        try {
          view.mount(ref.current);
        } catch (e) {
          console.error(`Error montando ${globalName}`, e);
        }
      }
    };

    if (w[globalName]) {
      doMount();
    } else {
      let s = document.querySelector(
        `script[data-native="${globalName}"]`
      ) as HTMLScriptElement | null;
      if (!s) {
        s = document.createElement("script");
        s.src = src;
        s.async = true;
        s.dataset.native = globalName;
        document.body.appendChild(s);
      }
      s.addEventListener("load", doMount, { once: true });
    }

    return () => {
      active = false;
      const view = w[globalName];
      if (view?.unmount) {
        try {
          view.unmount();
        } catch {
          /* noop */
        }
      }
    };
  }, [src, globalName]);

  return <div ref={ref} />;
}
