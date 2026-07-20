export const AMAUTA_CONFIG = {
  SUPABASE_URL: 'https://jfjqydgqzlwnyngcmzwu.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmanF5ZGdxemx3bnluZ2Ntend1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNjQwNDIsImV4cCI6MjA5ODY0MDA0Mn0.v50WPf-W3NSzVaP9R6hi9xfENmtCSADXcybZ5M9wLvY',
  CATEGORY_ORDER: ['Equity US', 'Renta Fija AR'],

  // Herramientas embebidas como secciones dentro del portal (iframe).
  // url:null → aún no disponible ("Próximamente").
  EMBEDS: {
    fci:       { title: 'Monitor FCIs',     subtitle: 'Fondos Comunes de Inversión · CAFCI', icon: '📊', url: 'https://monitor-fci-amauta.vercel.app/' },
    chat:      { title: 'Chat Financiero',  subtitle: 'Asistente financiero con IA',          icon: '💬', url: 'https://amauta-chat-financiero.vercel.app/' },
    simulador: { title: 'Simulador',        subtitle: 'Escenarios y proyección de inversiones', icon: '🧮', url: null },
  },
};
