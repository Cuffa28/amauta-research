/**
 * Tenencias agregadas de la industria.
 * Fuente: fonditos.ar (MCP) · composicion_cartera + exposicion_activo + curva_rendimientos.
 */
import { fonditos } from "@/lib/fonditos";
import FciShell from "@/components/fci/FciShell";
import { Section, ErrorBox, EmptyBox, Chip } from "@/components/fci/ui";
import { titleCase } from "@/lib/fci/constants";
import type { ComposicionCartera, ExposicionActivo, ExposicionFondoRow } from "@/lib/fci/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export const metadata = { title: "Tenencias · Monitor FCIs · Amauta" };

interface SP {
  activo?: string;
}

const CAT_COLOR: Record<string, string> = {
  "RENTA FIJA": "bg-blue-500",
  "RENTA MIXTA": "bg-purple-500",
  "MERCADO DE DINERO": "bg-emerald-500",
  "RENTA VARIABLE": "bg-orange-500",
  PYMES: "bg-pink-500",
  "RETORNO TOTAL": "bg-cyan-500",
  INFRAESTRUCTURA: "bg-teal-500",
  "FONDOS CERRADOS": "bg-slate-500",
  ASG: "bg-lime-500",
};

function pesoOf(r: ExposicionFondoRow): number | null {
  const v = r.peso_pct ?? r.peso;
  return typeof v === "number" ? v : null;
}

export default async function TenenciasPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const activo = (sp.activo ?? "").trim();

  const [cartera, exposicion, curva] = await Promise.all([
    fonditos<ComposicionCartera>("composicion_cartera", {}).catch(() => null),
    activo
      ? fonditos<ExposicionActivo>("exposicion_activo", { activo, limite: 20 }).catch(() => null)
      : Promise.resolve(null),
    fonditos<unknown>("curva_rendimientos", {}).catch(() => null),
  ]);

  const catRows = cartera?.rows ?? [];
  const totalFondos = catRows.reduce((a, r) => a + r.n_fondos, 0);
  const maxCat = Math.max(1, ...catRows.map((r) => r.n_fondos));
  const topCat = catRows[0];

  return (
    <FciShell
      kicker="Cartera agregada · fonditos · CAFCI"
      title="Tenencias del mercado"
      subtitle="Cómo se reparte el universo de fondos por categoría y qué fondos están expuestos a un activo puntual."
      kpis={[
        { label: "Fondos relevados", value: totalFondos ? totalFondos.toLocaleString("es-AR") : "—" },
        { label: "Categorías", value: catRows.length ? String(catRows.length) : "—" },
        { label: "Mayor categoría", value: topCat ? titleCase(topCat.categoria) : "—", sub: topCat ? `${topCat.n_fondos} fondos` : undefined },
        { label: "Activo buscado", value: activo || "—" },
      ]}
    >
      <div className="space-y-6">
        {/* Composición agregada */}
        <Section title="Distribución por categoría" subtitle={cartera ? `${totalFondos.toLocaleString("es-AR")} fondos` : undefined}>
          {!cartera ? (
            <div className="p-4">
              <ErrorBox message="La composición agregada no está disponible." />
            </div>
          ) : catRows.length === 0 ? (
            <EmptyBox icon="🧩" title="Sin datos" />
          ) : (
            <div className="p-4 sm:p-5 space-y-3">
              {catRows.map((r) => (
                <div key={r.categoria} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 text-sm mb-1.5">
                      <span className="font-bold text-text-primary truncate">{titleCase(r.categoria)}</span>
                      <span className="text-xs text-text-tertiary shrink-0">
                        {((r.n_fondos / totalFondos) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2.5 bg-surface-overlay rounded-xs overflow-hidden">
                      <div
                        className={`h-full ${CAT_COLOR[r.categoria] ?? "bg-slate-400"}`}
                        style={{ width: `${(r.n_fondos / maxCat) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-extrabold tabular-nums text-amauta-yellow w-12 text-right">
                    {r.n_fondos}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Exposición a un activo */}
        <Section title="Exposición a un activo">
          <div className="p-4 sm:p-5 border-b border-brand-border">
            <form method="get" action="/fondos/tenencias" className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                name="activo"
                defaultValue={activo}
                placeholder="Ticker o nombre del activo (ej: TZX28, AO27, GD30)"
                className="flex-1 rounded-sm border border-brand-border bg-surface-overlay text-text-primary px-4 py-2.5 text-sm font-medium placeholder:text-text-tertiary focus:outline-none focus:border-amauta-yellow focus:ring-2 focus:ring-amauta-yellow/30 transition-colors"
              />
              <button
                type="submit"
                className="rounded-sm bg-amauta-yellow text-amauta-dark font-extrabold uppercase tracking-wider text-xs px-6 py-2.5 hover:bg-amauta-yellow-hover transition-colors"
              >
                Buscar exposición
              </button>
            </form>
          </div>

          {!activo ? (
            <EmptyBox
              icon="🎯"
              title="Buscá un activo"
              message="Ingresá un ticker o nombre para ver qué fondos lo tienen en cartera y con qué peso."
            />
          ) : !exposicion ? (
            <div className="p-4">
              <ErrorBox message={`No se pudo consultar la exposición a “${activo}”.`} />
            </div>
          ) : exposicion.fondos.length === 0 ? (
            <EmptyBox
              icon="🔍"
              title="Sin exposición registrada"
              message={`No encontramos fondos con exposición a “${activo}” en el desglose disponible. Probá con el ticker exacto.`}
            />
          ) : (
            <>
              <div className="px-4 sm:px-5 py-3 flex flex-wrap gap-2 border-b border-brand-border bg-surface-overlay/40">
                <MiniStat label="Fondos expuestos" value={String(exposicion.total_fondos)} />
                <MiniStat label="Peso promedio" value={`${exposicion.peso_promedio.toFixed(2)}%`} />
                <MiniStat label="Peso máx." value={`${exposicion.peso_max.toFixed(2)}%`} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[480px]">
                  <thead className="text-text-tertiary border-b border-brand-border">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-extrabold uppercase tracking-wider text-[10px]">Fondo</th>
                      <th className="px-3 py-2.5 text-left font-extrabold uppercase tracking-wider text-[10px] hidden sm:table-cell">Categoría</th>
                      <th className="px-4 py-2.5 text-right font-extrabold uppercase tracking-wider text-[10px]">Peso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exposicion.fondos.map((f, i) => {
                      const peso = pesoOf(f);
                      return (
                        <tr key={`${f.fondo}-${i}`} className={`border-b border-brand-border ${i % 2 ? "bg-white/[0.02]" : ""}`}>
                          <td className="px-4 py-2.5 font-bold text-text-primary">{f.fondo}</td>
                          <td className="px-3 py-2.5 hidden sm:table-cell">
                            {f.categoria ? <Chip tone="gray">{titleCase(String(f.categoria))}</Chip> : <span className="text-text-tertiary">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-bold text-amauta-yellow">
                            {peso != null ? `${peso.toFixed(2)}%` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Section>

        {/* Curva de rendimientos */}
        <Section title="Curva de rendimientos">
          {curva ? (
            <div className="p-4 sm:p-5">
              <p className="text-sm text-text-secondary mb-3">
                Datos de curva disponibles desde la fuente.
              </p>
              <details className="group">
                <summary className="cursor-pointer text-xs font-extrabold uppercase tracking-wider text-amauta-yellow hover:text-amauta-yellow-hover transition-colors">
                  Ver datos crudos
                </summary>
                <pre className="mt-3 text-xs bg-surface-overlay border border-brand-border rounded-sm p-4 overflow-x-auto text-text-secondary">
                  {JSON.stringify(curva, null, 2).slice(0, 4000)}
                </pre>
              </details>
            </div>
          ) : (
            <div className="p-4">
              <ErrorBox
                title="Curva no disponible"
                message="El servicio de curva de rendimientos no está respondiendo en este momento. Volvé a intentar más tarde."
              />
            </div>
          )}
        </Section>
      </div>
    </FciShell>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-raised rounded-lg border border-brand-border px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider font-extrabold text-text-tertiary">{label}</p>
      <p className="text-sm font-extrabold text-amauta-yellow tabular-nums">{value}</p>
    </div>
  );
}
