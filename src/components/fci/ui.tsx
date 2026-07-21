/**
 * Primitivas de UI compartidas por las vistas de FCIs (estilo claro on-brand).
 * Todos son server components sin estado.
 */
import type { ReactNode } from "react";

/** Tarjeta con header oscuro uppercase + cuerpo blanco. */
export function Section({
  title,
  subtitle,
  right,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`bg-white rounded-sm border border-black/5 shadow-card overflow-hidden ${className}`}
    >
      <header className="bg-amauta-dark text-white px-5 sm:px-6 py-3.5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-extrabold text-sm uppercase tracking-wider">{title}</h2>
        {subtitle && <p className="text-[11px] text-white/55 font-medium">{subtitle}</p>}
        {right}
      </header>
      {children}
    </section>
  );
}

/** Tile de estadística (borde superior amarillo). */
export function StatTile({
  label,
  value,
  tone = "default",
  sub,
}: {
  label: string;
  value: string;
  tone?: "default" | "pos" | "neg";
  sub?: string;
}) {
  const valueColor =
    tone === "pos"
      ? "text-emerald-600"
      : tone === "neg"
        ? "text-red-600"
        : "text-amauta-text";
  return (
    <div className="bg-white rounded-sm border border-black/5 border-t-[3px] border-t-amauta-yellow shadow-card px-4 py-3.5">
      <p className="text-[10px] uppercase tracking-[0.12em] font-extrabold text-amauta-text-tertiary mb-1">
        {label}
      </p>
      <p className={`text-xl sm:text-2xl font-extrabold leading-none tabular-nums ${valueColor}`}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-amauta-text-tertiary mt-1">{sub}</p>}
    </div>
  );
}

/** Chip / badge de texto. */
export function Chip({
  children,
  tone = "bordo",
}: {
  children: ReactNode;
  tone?: "bordo" | "yellow" | "blue" | "green" | "gray";
}) {
  const cls: Record<string, string> = {
    bordo: "bg-amauta-bordo/8 text-amauta-bordo",
    yellow: "bg-amauta-yellow/25 text-[#7a6800]",
    blue: "bg-blue-100 text-blue-700",
    green: "bg-emerald-100 text-emerald-700",
    gray: "bg-black/6 text-amauta-text-secondary",
  };
  return (
    <span
      className={`inline-block text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-xs ${cls[tone]}`}
    >
      {children}
    </span>
  );
}

/** Estado de error prolijo (no crashea la página). */
export function ErrorBox({
  title = "No se pudieron cargar los datos",
  message,
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="bg-white rounded-sm border border-black/5 shadow-card p-8 sm:p-10 text-center">
      <div className="text-4xl mb-3" aria-hidden>
        ⚠️
      </div>
      <h3 className="text-base font-extrabold text-amauta-bordo">{title}</h3>
      <p className="mt-2 text-sm text-amauta-text-secondary max-w-md mx-auto">
        {message ??
          "La fuente de datos no respondió. Volvé a intentar en unos minutos."}
      </p>
    </div>
  );
}

/** Estado vacío. */
export function EmptyBox({
  icon = "🔍",
  title,
  message,
}: {
  icon?: string;
  title: string;
  message?: string;
}) {
  return (
    <div className="px-6 py-12 text-center">
      <div className="text-4xl mb-3 opacity-40" aria-hidden>
        {icon}
      </div>
      <p className="text-base font-extrabold text-amauta-bordo">{title}</p>
      {message && (
        <p className="mt-1.5 text-sm text-amauta-text-secondary max-w-sm mx-auto">
          {message}
        </p>
      )}
    </div>
  );
}
