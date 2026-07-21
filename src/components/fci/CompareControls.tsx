"use client";

/**
 * Selector de fondos para la vista Comparar.
 * Hasta 4 nombres (fonditos acepta match difuso) + fecha desde.
 * Actualiza la URL (?fondos=a|b|c&from=YYYY-MM-DD) → el server refetchea.
 */
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CompareControls({
  initialFondos,
  initialFrom,
}: {
  initialFondos: string[];
  initialFrom: string;
}) {
  const router = useRouter();
  const seed = [...initialFondos, "", "", "", ""].slice(0, 4);
  const [fondos, setFondos] = useState<string[]>(seed);
  const [from, setFrom] = useState(initialFrom);

  function update(i: number, v: string) {
    setFondos((prev) => prev.map((x, idx) => (idx === i ? v : x)));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = fondos.map((f) => f.trim()).filter(Boolean);
    const p = new URLSearchParams();
    if (clean.length) p.set("fondos", clean.join("|"));
    if (from) p.set("from", from);
    router.push(`/fondos/comparar?${p.toString()}`);
  }

  return (
    <form
      onSubmit={submit}
      className="bg-surface-raised rounded-lg border border-brand-border p-5 mb-6"
    >
      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-amauta-yellow mb-3">
        Elegí de 2 a 4 fondos
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {fondos.map((f, i) => (
          <div key={i} className="flex flex-col gap-1">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
              Fondo {i + 1}
            </label>
            <input
              type="text"
              value={f}
              onChange={(e) => update(i, e.target.value)}
              placeholder={i < 2 ? "Ej: Delta Pesos" : "Opcional"}
              className="rounded-sm border border-brand-border bg-surface-overlay text-text-primary px-3 py-2.5 text-sm font-medium placeholder:text-text-tertiary focus:outline-none focus:border-amauta-yellow focus:ring-2 focus:ring-amauta-yellow/30 transition-colors"
            />
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary">
            Desde
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-sm border border-brand-border bg-surface-overlay text-text-primary px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-amauta-yellow focus:ring-2 focus:ring-amauta-yellow/30 transition-colors [color-scheme:dark]"
          />
        </div>
        <button
          type="submit"
          className="rounded-sm bg-amauta-yellow text-amauta-dark font-extrabold uppercase tracking-wider text-xs px-6 py-3 hover:bg-amauta-yellow-hover transition-colors"
        >
          Comparar
        </button>
      </div>
    </form>
  );
}
