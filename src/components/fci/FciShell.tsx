/**
 * Shell reutilizable de la sección FCIs (tema oscuro del portal).
 *
 * - Hero plano (tarjeta surface-raised) con barra amarilla a la izquierda,
 *   kicker amarillo, título grande, subtítulo y fila de KPIs en tiles.
 * - Debajo, la sub-nav de tabs y el contenedor de la vista.
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
    <div className="space-y-6">
        {/* ── Hero plano ─────────────────────────────────────────────── */}
        <header className="relative overflow-hidden bg-surface-raised border border-brand-border rounded-lg p-6 sm:p-8">
          <span className="absolute top-0 left-0 h-full w-1 bg-amauta-yellow" aria-hidden />
          {kicker && (
            <p className="text-[11px] uppercase tracking-[0.18em] text-amauta-yellow font-extrabold mb-2">
              {kicker}
            </p>
          )}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight text-text-primary">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm text-text-secondary max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          )}

          {kpis && kpis.length > 0 && (
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {kpis.map((k) => (
                <div
                  key={k.label}
                  className="bg-surface-overlay border border-brand-border rounded-lg px-4 py-3.5"
                >
                  <p className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-bold mb-1">
                    {k.label}
                  </p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-extrabold text-amauta-yellow leading-tight tabular-nums">
                    {k.value}
                  </p>
                  {k.sub && (
                    <p className="text-[11px] text-text-tertiary mt-0.5 truncate">{k.sub}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </header>

        {/* ── Sub-nav ────────────────────────────────────────────────── */}
        <div className="border-b border-brand-border">
          <FciTabs />
        </div>

        {/* ── Contenido ──────────────────────────────────────────────── */}
        <div className="space-y-6">{children}</div>
    </div>
  );
}
