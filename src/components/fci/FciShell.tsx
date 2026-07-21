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
    <div className="space-y-5">
      {/* ── Encabezado (texto, como CEDEARs) ─────────────────────────── */}
      <div>
        {kicker && (
          <p className="text-[11px] uppercase tracking-[0.18em] text-amauta-yellow font-extrabold mb-1.5">
            {kicker}
          </p>
        )}
        <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold leading-tight text-text-primary">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-sm text-text-secondary max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {/* ── KPIs: tarjetas que resaltan (borde superior amarillo) ────── */}
      {kpis && kpis.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {kpis.map((k) => (
            <div
              key={k.label}
              className="bg-surface-raised border border-brand-border border-t-2 border-t-amauta-yellow rounded-lg px-5 py-4"
            >
              <p className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-extrabold mb-1.5">
                {k.label}
              </p>
              <p className="text-xl sm:text-2xl font-extrabold text-text-primary leading-none tabular-nums">
                {k.value}
              </p>
              {k.sub && (
                <p className="text-[11px] text-text-tertiary mt-1.5 truncate">{k.sub}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Sub-nav ────────────────────────────────────────────────── */}
      <div className="border-b border-brand-border">
        <FciTabs />
      </div>

      {/* ── Contenido ──────────────────────────────────────────────── */}
      <div className="space-y-6">{children}</div>
    </div>
  );
}
