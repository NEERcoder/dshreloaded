import Icon from "./Icon";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-20 border-t border-surface-border bg-surface-soft elephant-watermark">
      <div className="container-px py-12 sm:py-16 relative z-10">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2 max-w-sm">
            <img
              src="/DSH_OFFICIAL_LOGO.png"
              alt="DU Science Hub"
              className="h-10 w-auto max-w-[11rem] object-contain mb-4"
              width={506}
              height={229}
            />
            <p className="text-sm text-ink-500 leading-relaxed">
              A student-powered platform for discovering Delhi University, learning from seniors
              and finding opportunities that help you move forward.
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-ink-400 mb-4">Navigation</p>
            <ul className="space-y-2.5">
              {[
                { label: "Explore DU", href: "#explore-du" },
                { label: "Join Our Team", href: "/join" },
                { label: "Opportunities", href: "/opportunities" },
              ].map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-sm text-ink-700 hover:text-brand-blue transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-ink-400 mb-4">Connect</p>
            <div className="flex gap-2 mb-4">
              <a href="#" aria-label="YouTube" className="p-2.5 rounded-xl border border-surface-border text-ink-700 hover:text-brand-red hover:bg-brand-red-soft transition-colors">
                <Icon name="youtube" className="h-5 w-5" />
              </a>
              <a href="#" aria-label="Instagram" className="p-2.5 rounded-xl border border-surface-border text-ink-700 hover:text-brand-blue hover:bg-brand-blue-soft transition-colors">
                <Icon name="instagram" className="h-5 w-5" />
              </a>
            </div>
            <ul className="space-y-2.5">
              {["Privacy Policy", "Terms", "Contact"].map((l) => (
                <li key={l}>
                  <a href="#" className="text-sm text-ink-700 hover:text-brand-blue transition-colors">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-surface-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-ink-400">© {year} DU Science Hub</p>
          <p className="text-xs text-ink-400">Built by students, for students.</p>
        </div>
      </div>
    </footer>
  );
}
