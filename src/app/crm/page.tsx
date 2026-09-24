import EmbedFrame from "@/components/EmbedFrame";

export const metadata = { title: "CRM · Amauta" };

export default function CrmPage() {
  // El ?v= fuerza al iframe a bajar la versión nueva del CRM y no la cacheada.
  // Bumpear esta fecha cada vez que se toque public/crm/index.html.
  return <EmbedFrame src="/crm/index.html?v=20260924" title="CRM Comercial" />;
}
