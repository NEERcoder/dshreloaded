import { useEffect, useState } from "react";
import Icon from "../Icon";
import { Link } from "../../lib/router";
import { getOpenTeamRoles } from "../../lib/dataAccess";

export default function JoinPreview() {
  const [openCount, setOpenCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    getOpenTeamRoles().then((result) => {
      if (cancelled) return;
      setOpenCount(result.data.filter((role) => role.isOpen).length);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="join" className="scroll-mt-24 border-t glass-panel-tint">
      <div className="container-px py-9 sm:py-12">
        <div className="glass-card flex flex-col items-start justify-between gap-5 p-6 sm:p-8 lg:flex-row lg:items-center">
          <div className="flex items-start gap-4">
            <span className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-red-soft text-brand-red">
              <Icon name="flag" className="h-6 w-6" />
            </span>
            <div>
              <p className="eyebrow text-brand-red">JOIN OUR TEAM</p>
              <h2 className="font-display mt-1.5 text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-900 leading-tight">
                Want to build JAVLIN with us?
              </h2>
              <p className="mt-1.5 max-w-xl text-sm sm:text-base leading-relaxed text-ink-600 font-medium">
                Design, content, growth, and campus correspondent roles — work with a student-powered team.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2.5 sm:flex-row sm:items-center">
            {openCount !== null && openCount > 0 && (
              <span className="text-xs font-extrabold uppercase tracking-wider text-ink-400">
                {openCount} role{openCount === 1 ? "" : "s"} open
              </span>
            )}
            <Link href="/join" className="btn-primary shadow-card">
              Join Our Team <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
