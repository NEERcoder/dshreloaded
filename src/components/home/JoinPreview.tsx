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
    <section id="join" className="band scroll-mt-24">
      <div className="container-px py-7 sm:py-10 lg:py-12">
        <div className="glass-card card-rail flex flex-col items-start justify-between gap-4 p-4 sm:p-6 lg:flex-row lg:items-center lg:gap-5 lg:p-8">
          <div className="flex items-start gap-3 sm:gap-4">
            <span className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-red-soft text-brand-red-ink">
              <Icon name="flag" className="h-6 w-6" />
            </span>
            <div>
              <p className="eyebrow">JOIN OUR TEAM</p>
              <h2 className="section-title font-display mt-1.5 leading-tight">
                Want to build JAVLIN with us?
              </h2>
              <p className="section-lede mt-1.5 max-w-xl sm:mt-2 sm:text-base">
                Design, content, growth, and campus correspondent roles — work with a student-powered team.
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col items-stretch gap-2.5 sm:w-auto sm:flex-row sm:items-center sm:justify-between">
            {openCount !== null && openCount > 0 && (
              <span className="text-xs font-extrabold uppercase tracking-wider text-ink-500 sm:mr-1">
                {openCount} role{openCount === 1 ? "" : "s"} open
              </span>
            )}
            <Link href="/join" className="btn-primary shadow-card justify-center">
              Join Our Team <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
