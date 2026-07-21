/**
 * Landing de FCIs — buscador + rankings.
 * Fuente: fonditos.ar (MCP) · buscar_fondos + ranking_fondos.
 */
import Link from "next/link";
import { fonditos } from "@/lib/fonditos";
import { fmtNumber, fmtPercent, fmtReturn } from "@/lib/utils/format";
import FciShell from "@/components/fci/FciShell";
import { Section, ErrorBox, EmptyBox, Chip } from "@/components/fci/ui";
import {
  PERIODOS,
  CATEGORIAS,
  CLASES,
  periodoLabel,
  compactArs,
  titleCase,
} from "@/lib/fci/constants";
import type { RankingFondos, BuscarFondos } from "@/lib/fci/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export const metadata = {
  title: "Fondos · Monitor FCIs · Amauta",
  description: "Buscador y rankings de Fondos Comunes de Inversión argentinos.",
};

interface SP {
  q?: string;
  periodo?: string;
  categoria?: string;
  clase?: string;
}

export default async function FondosPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const periodo = PERIODOS.some((p) => p.value === sp.periodo) ? sp.periodo! : "30d";
  const categoria = (sp.categoria ?? "").trim();
  const clase = (sp.clase ?? "").trim();

  const rankingArgs: Record<string, unknown> = { periodo, limite: 60 };
  if (categoria) rankingArgs.categoria = categoria;
  if (clase) rankingArgs.clase = clase;

  const [ranking, search] = await Promise.all([
    fonditos<RankingFondos>("ranking_fondos", rankingArgs).catch(() => null),
    q
      ? fonditos<BuscarFondos>("buscar_fondos", { q, limite: 12 }).catch(() => null)
      : Promise.resolve(null),
  ]);

  const rows = ranking?.rows ?? [];
  const best = rows[0];

  const buildHref = (ov: Partial<SP>) => {
    const merged: SP = { q, periodo, categoria, clase, ...ov };
    const p = new URLSearchParams();
    if (merged.q) p.set("q", merged.q);
    if (merged.periodo && merged.periodo !== "30d") p.set("periodo", merged.periodo);
    if (merged.categoria) p.set("categoria", merged.categoria);
    if (merged.clase) p.set("clase", merged.clase);
    const qs = p.toString();
    return qs ? `/fondos?${qs}` : "/fondos";
  };

  return (
    <FciShell
      kicker="Mercado argentino · fonditos · CAFCI"
      title="Fondos Comunes de Inversión"
      subtitle="Buscá cualquier fondo o explorá los rankings de rendimiento por período, categoría y clase. Datos oficiales con actualización diaria."
      kpis={[
        { label: "Período", value: periodoLabel(periodo) },
        { label: "Fondos rankeados", value: ranking ? String(ranking.count) : "—" },
        {
          label: "Mejor del período",
          value: best ? fmtReturn(best.return_pct, 2).text : "—",
          sub: best?.fondo,
        },
        { label: "Categoría", value: categoria ? titleCase(categoria) : "Todas" },
      ]}
    >
      {/* ── Buscador ──────────────────────────────────────────────────── */}
      <form method="get" action="/fondos" className="mb-6">
        {periodo !== "30d" && <input type="hidden" name="periodo" value={periodo} />}
        {categoria && <input type="hidden" name="categoria" value={categoria} />}
        {clase && <input type="hidden" name="clase" value={clase} />}
        <label
          htmlFor="q"
          className="block text-[11px] font-extrabold uppercase tracking-[0.14em] text-amauta-bordo mb-1.5"
        >
          Buscar fondo
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="q"
            name="q"
            type="text"
            defaultValue={q}
            placeholder="Ej: Galileo Renta Fija, Delta Pesos, Mercado Pago…"
            className="flex-1 rounded-sm border border-black/10 bg-white px-4 py-3 text-sm font-medium placeholder:text-amauta-text-tertiary/60 focus:outline-none focus:border-amauta-yellow focus:ring-2 focus:ring-amauta-yellow/30 transition-colors shadow-card"
          />
          <button
            type="submit"
            className="rounded-sm bg-amauta-yellow text-amauta-dark font-extrabold uppercase tracking-wider text-xs px-6 py-3 hover:bg-amauta-yellow-hover transition-colors shadow-card"
          >
            Buscar
          </button>
        </div>
      </form>

      {/* ── Resultados de búsqueda ────────────────────────────────────── */}
      {q && (
        <div className="mb-6">
          <Section
            title="Resultados de búsqueda"
            subtitle={search ? `${search.total} coincidencia${search.total === 1 ? "" : "s"} para “${q}”` : undefined}
          >
            {!search ? (
              <div className="p-4">
                <ErrorBox message="No se pudo ejecutar la búsqueda." />
              </div>
            ) : search.data.length === 0 ? (
              <EmptyBox
                title="Sin coincidencias"
                message={`No encontramos fondos que coincidan con “${q}”. Probá otro término.`}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                  <thead className="bg-amauta-bordo text-white">
                    <tr>
                      <Th className="text-left">Fondo</Th>
                      <Th className="text-left hidden sm:table-cell">Categoría</Th>
                      <Th className="text-right">VCP</Th>
                      <Th className="text-right">Patrimonio</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {search.data.map((r, i) => (
                      <tr
                        key={r.fondo}
                        className={`border-t border-black/5 hover:bg-amauta-yellow/5 transition-colors ${i % 2 ? "bg-black/[0.015]" : ""}`}
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/fondo/${encodeURIComponent(r.fondo)}`}
                            className="font-extrabold text-amauta-bordo hover:underline"
                          >
                            {r.fondo}
                          </Link>
                          <div className="mt-0.5 text-xs text-amauta-text-tertiary sm:hidden">
                            {titleCase(r.categoria)} · {r.moneda}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <Chip tone="gray">{titleCase(r.categoria)}</Chip>
                          <span className="ml-2 text-xs text-amauta-text-tertiary">{r.moneda}</span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">{fmtNumber(r.vcp, 2)}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">{compactArs(r.patrimonio)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>
      )}

      {/* ── Filtros del ranking ───────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-amauta-text-tertiary mr-1">
          Período
        </span>
        {PERIODOS.map((p) => (
          <Link
            key={p.value}
            href={buildHref({ periodo: p.value })}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${
              periodo === p.value
                ? "bg-amauta-bordo text-white border-amauta-bordo"
                : "bg-white text-amauta-text-secondary border-black/10 hover:border-amauta-bordo hover:text-amauta-bordo"
            }`}
          >
            {p.label}
          </Link>
        ))}
      </div>

      <form method="get" action="/fondos" className="mb-5 flex flex-wrap items-end gap-3">
        {q && <input type="hidden" name="q" value={q} />}
        {periodo !== "30d" && <input type="hidden" name="periodo" value={periodo} />}
        <FilterSelect id="categoria" label="Categoría" value={categoria} options={[...CATEGORIAS]} render={titleCase} />
        <FilterSelect id="clase" label="Clase" value={clase} options={[...CLASES]} />
        <button
          type="submit"
          className="rounded-sm bg-amauta-dark text-white font-extrabold uppercase tracking-wider text-xs px-5 py-2.5 hover:bg-amauta-dark-hover transition-colors"
        >
          Aplicar
        </button>
        {(categoria || clase) && (
          <Link
            href={buildHref({ categoria: "", clase: "" })}
            className="text-xs font-bold text-amauta-text-tertiary hover:text-amauta-bordo transition-colors py-2.5"
          >
            Limpiar
          </Link>
        )}
      </form>

      {/* ── Tabla de ranking ──────────────────────────────────────────── */}
      <Section
        title="Ranking por rendimiento"
        subtitle={ranking ? `${periodoLabel(periodo)} · ${ranking.from} → ${ranking.to}` : undefined}
      >
        {!ranking ? (
          <div className="p-4">
            <ErrorBox message="El ranking no está disponible en este momento." />
          </div>
        ) : rows.length === 0 ? (
          <EmptyBox icon="📊" title="Sin resultados" message="Probá con otra categoría o clase." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-amauta-bordo text-white">
                <tr>
                  <Th className="text-left w-12">#</Th>
                  <Th className="text-left">Fondo</Th>
                  <Th className="text-left hidden md:table-cell">Categoría</Th>
                  <Th className="text-center hidden sm:table-cell">Clase</Th>
                  <Th className="text-right">Retorno</Th>
                  <Th className="text-right">TNA</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const ret = fmtReturn(r.return_pct, 2);
                  const podium = i < 3;
                  const rowBg =
                    i === 0
                      ? "bg-amauta-yellow/10"
                      : i === 1
                        ? "bg-slate-100/60"
                        : i === 2
                          ? "bg-amber-50"
                          : i % 2
                            ? "bg-black/[0.015]"
                            : "";
                  return (
                    <tr
                      key={r.fondo}
                      className={`border-t border-black/5 hover:bg-amauta-yellow/5 transition-colors ${rowBg}`}
                    >
                      <td className="px-4 py-3 align-top">
                        {podium ? (
                          <span className="text-base" aria-label={`Top ${i + 1}`}>
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                          </span>
                        ) : (
                          <span className="tabular-nums text-amauta-text-tertiary text-xs">{i + 1}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-[24rem]">
                        <Link
                          href={`/fondo/${encodeURIComponent(r.fondo)}`}
                          className="font-extrabold text-amauta-bordo hover:underline leading-snug"
                        >
                          {r.fondo}
                        </Link>
                        <div className="mt-0.5 text-xs text-amauta-text-tertiary md:hidden">
                          {titleCase(r.categoria)}
                          {r.moneda ? ` · ${r.moneda}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell align-top">
                        <Chip tone="gray">{titleCase(r.categoria)}</Chip>
                        {r.moneda && (
                          <span className="ml-2 text-xs text-amauta-text-tertiary">{r.moneda}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell align-top tabular-nums font-medium">
                        {r.clase ?? "—"}
                      </td>
                      <td className={`px-4 py-3 text-right tabular-nums font-extrabold align-top ${ret.colorClass}`}>
                        {ret.text}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-xs font-bold text-amauta-text-secondary align-top">
                        {fmtPercent(r.tna_pct, 1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <p className="mt-4 text-xs text-amauta-text-tertiary leading-relaxed max-w-3xl">
        <strong className="text-amauta-text-secondary">Retorno:</strong> variación del VCP en el período ·{" "}
        <strong className="text-amauta-text-secondary">TNA:</strong> tasa nominal anualizada (para períodos
        cortos puede resultar poco representativa). Fuente: fonditos · CAFCI. Este material es informativo y no
        constituye recomendación de inversión.
      </p>
    </FciShell>
  );
}

// ── Sub-componentes ──────────────────────────────────────────────────────────

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-3 font-extrabold uppercase tracking-wider text-[11px] whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
}

function FilterSelect({
  id,
  label,
  value,
  options,
  render,
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  render?: (s: string) => string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-amauta-text-tertiary"
      >
        {label}
      </label>
      <select
        id={id}
        name={id}
        defaultValue={value}
        className="rounded-sm border border-black/10 bg-white px-3 py-2.5 text-sm font-medium focus:outline-none focus:border-amauta-yellow focus:ring-2 focus:ring-amauta-yellow/30 transition-colors min-w-[9rem]"
      >
        <option value="">Todas</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {render ? render(o) : o}
          </option>
        ))}
      </select>
    </div>
  );
}
