import EmbedFrame from "@/components/EmbedFrame";

// TEMPORAL (Etapa 1): embebido por iframe a la app externa.
// En la Etapa 2 se reemplaza por las rutas nativas del Monitor FCIs.
export default function FondosPage() {
  return <EmbedFrame src="https://monitor-fci-amauta.vercel.app/" title="Monitor FCIs" />;
}
