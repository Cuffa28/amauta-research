/**
 * Comparar fondos (base 100).
 * Fuente: fonditos.ar (MCP) · comparar_fondos.
 * Selección vía searchParams: ?fondos=a|b|c&from=YYYY-MM-DD
 */
import Link from "next/link";
import { fonditos } from "@/lib/fonditos";
import { fmtReturn } from "@/lib/utils/format";
import FciShell from "@/components/fci/FciShell";
import { Section, ErrorBox, EmptyBox } from "@/components/fci/ui";
import CompareControls from "@/components/fci/CompareControls";
import CompareChart, { COMPARE_COLORS } from "@/components/fci/charts/CompareChart";
import type { CompararFondos } from "@/lib/fci/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export const metadata = {
  title: "Comparar · Monitor FCIs · Amauta",
};

interface SP {
  fondos?: string;
  from?: string;
  to?: string;
}

function defaultFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d.toISOString().slice(0, 10);
}

export default async function CompararPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const fondos = (sp.fondos ?? "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
  const from = (sp.from ?? "").trim() || defaultFrom();

  const canCompare = fondos.length >= 2;

  const data = canCompare
    ? await fonditos<CompararFondos>("comparar_fondos", {
        fondos,
        from,
        ...(sp.to ? { to: sp.to } : {}),
      }).catch(() => null)
    : null;

  const chart = data?.chart_data ?? [];
  const keys = (data?.series ?? []).map((s) => s.fondo);

  // Resumen de retornos: base 100 → último valor - 100.
  const last = chart[chart.length - 1];
  const summary = keys.map((k, i) => {
    const v = last ? Number(last[k]) : NaN;
    return { fondo: k, color: COMPARE_COLORS[i % COMPARE_COLORS.length], ret: isNaN(v) ? null : v - 100 };
  });

  return (
    <FciShell
      kicker="Análisis comparado · fonditos · CAFCI"
      title="Comparar fondos"
      subtitle="Evolución base 100 de hasta 4 fondos en la ventana elegida. Ideal para ver cuál rindió más en el mismo período."
      kpis={[
        { label: "Fondos", value: canCompare ? String(fondos.length) : "—" },
        { label: "Desde", value: data?.from ?? from },
        { label: "Hasta", value: data?.to ?? "—" },
        {
          label: "Mejor",
          value:
            summary.length && summary.some((s) => s.ret != null)
              ? fmtReturn(
                  Math.max(...summary.filter((s) => s.ret != null).map((s) => s.ret as number)),
                  2,
                ).text
              : "—",
        },
      ]}
    >
      <CompareControls initialFondos={fondos} initialFrom={from} />

      {!canCompare ? (
        <Section title="Comparador">
          <EmptyBox
            icon="⚖️"
            title="Elegí al menos 2 fondos"
            message="Escribí los nombres arriba (por ejemplo “Delta Pesos” y “Galileo Renta Fija”) y presioná Comparar."
          />
        </Section>
      ) : !data ? (
        <ErrorBox message="No se pudo generar la comparación. Verificá los nombres de los fondos e intentá de nuevo." />
      ) : chart.length === 0 ? (
        <Section title="Comparador">
          <EmptyBox
            icon="🔍"
            title="Sin datos para comparar"
            message="No encontramos series para esos fondos en la ventana elegida. Probá otros nombres o una fecha anterior."
          />
        </Section>
      ) : (
        <div className="space-y-6">
          {/* Resumen */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {summary.map((s) => {
              const r = fmtReturn(s.ret, 2);
              return (
                <div
                  key={s.fondo}
                  className="bg-white rounded-sm border border-black/5 shadow-card p-4 border-l-[3px]"
                  style={{ borderLeftColor: s.color }}
                >
                  <p className="text-xs font-bold text-amauta-text-secondary leading-snug line-clamp-2 min-h-[2.4em]">
                    {s.fondo}
                  </p>
                  <p className={`mt-2 text-2xl font-extrabold tabular-nums ${r.colorClass}`}>{r.text}</p>
                  <p className="text-[11px] text-amauta-text-tertiary mt-0.5">en el período</p>
                </div>
              );
            })}
          </div>

          {/* Gráfico */}
          <Section title="Evolución base 100" subtitle={`${data.from} → ${data.to}`}>
            <div className="p-4 sm:p-5">
              <CompareChart data={chart} keys={keys} />
            </div>
          </Section>
        </div>
      )}

      <p className="mt-4 text-xs text-amauta-text-tertiary leading-relaxed max-w-3xl">
        Todas las series arrancan en 100 en la fecha inicial para comparar rendimiento relativo.{" "}
        <Link href="/fondos" className="text-amauta-bordo font-bold hover:underline">
          Buscar fondos
        </Link>{" "}
        para conocer los nombres exactos. Fuente: fonditos · CAFCI.
      </p>
    </FciShell>
  );
}
