/**
 * Shell reutilizable de la sección FCIs (estilo claro on-brand).
 *
 * - Banda oscura (hero) full-width con kicker amarillo, título grande,
 *   subtítulo, fila de KPIs y la sub-nav de tabs integrada abajo.
 * - Debajo, un contenedor claro max-w-7xl donde va el contenido de la vista.
 *
 * Server component: recibe los datos ya fetcheados como props.
 */
import type { ReactNode } from "react";
import FciTabs from "./FciTabs";

export interface Kpi {
  label: string;
  value: string;
  sub?: string;
}

export default function FciShell({
  kicker,
  title,
  subtitle,
  kpis,
  children,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  kpis?: Kpi[];
  children: ReactNode;
}) {
  return (
    <div className="min-h-full bg-amauta-bg-light">
      {/* ── Hero oscuro ─────────────────────────────────────────────── */}
      <header className="bg-amauta-dark text-white shadow-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="pt-7 pb-5">
            {kicker && (
              <p className="text-[11px] uppercase tracking-[0.18em] text-amauta-yellow font-extrabold mb-2">
                {kicker}
              </p>
            )}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-sm text-white/60 max-w-2xl leading-relaxed">
                {subtitle}
              </p>
            )}

            {kpis && kpis.length > 0 && (
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/10 rounded-sm overflow-hidden">
                {kpis.map((k) => (
                  <div key={k.label} className="bg-amauta-dark px-4 py-3.5">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-white/55 font-bold mb-1">
                      {k.label}
                    </p>
                    <p className="text-lg sm:text-xl lg:text-2xl font-extrabold text-amauta-yellow leading-tight tabular-nums">
                      {k.value}
                    </p>
                    {k.sub && (
                      <p className="text-[11px] text-white/45 mt-0.5 truncate">{k.sub}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Sub-nav ──────────────────────────────────────────────── */}
          <div className="border-t border-white/10">
            <FciTabs />
          </div>
        </div>
      </header>

      {/* ── Contenido ───────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</div>
    </div>
  );
}
