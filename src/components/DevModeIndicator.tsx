import { isSupabaseConfigured } from "../lib/supabase";

export default function DevModeIndicator() {
  if (isSupabaseConfigured) return null;

  return (
    <aside aria-label="Development status" className="fixed bottom-4 right-4 z-50 pointer-events-none">
      <div className="flex items-center gap-2 rounded-full border border-surface-border bg-white/95 px-3 py-1.5 shadow-card backdrop-blur text-xs font-semibold text-ink-600 pointer-events-auto">
        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
        <span>Local Development Mode</span>
        <a href="/admin" className="ml-1 text-brand-blue hover:underline font-bold">
          Admin
        </a>
      </div>
    </aside>
  );
}
