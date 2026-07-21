import EmbedFrame from "@/components/EmbedFrame";

// TEMPORAL (Etapa 1): embebido por iframe a la app externa.
// En la Etapa 3 se reemplaza por la ruta nativa del Chat Financiero (+ /api/chat).
export default function ChatPage() {
  return <EmbedFrame src="https://amauta-chat-financiero.vercel.app/" title="Chat Financiero" />;
}
