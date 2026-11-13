import EmbedFrame from "@/components/EmbedFrame";

export const metadata = { title: "Macro Lab · Amauta" };

export default function MacroPage() {
  // ?v= fuerza al iframe a bajar la versión nueva del Macro Lab (evita caché vieja).
  // Bumpear al cambiar public/macro-lab/index.html.
  return <EmbedFrame src="/macro-lab/index.html?embed=1&v=20261113" title="Macro Lab · Research económico" />;
}
