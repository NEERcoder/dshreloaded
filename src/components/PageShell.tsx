import { createContext, useContext, useEffect, type ReactNode } from "react";
import Footer from "./Footer";
import SectionTabs from "./SectionTabs";
import type { BackgroundPreset } from "./InteractiveDotGrid";
import Navbar from "./Navbar";
import { useLocation } from "../lib/router";
import { isFeedScrollRoot, isSectionTabPath, isSectionTabRoot } from "../lib/sidebarNav";

type PageShellProps = {
  children: ReactNode;
  title: string;
  description?: string;
  // Retained so the ~30 call sites keep compiling. The animated canvas that
  // consumed it is gone; the static page-canvas texture does not vary by
  // preset, so the value is accepted and ignored rather than deleted here.
  backgroundPreset?: BackgroundPreset;
};

/**
 * Set by the desktop section shell (App.tsx) around the page it renders inside
 * the homepage rail. A page is still a page — same component, same queries, same
 * guards — but its own navbar, canvas and footer are suppressed because the shell
 * already provides them, and only the content clearance is kept for the fixed
 * top bar. Nothing outside the shell ever reads this, so every standalone route
 * renders exactly as before.
 */
export const SectionShellContext = createContext(false);

export function useInSectionShell(): boolean {
  return useContext(SectionShellContext);
}

function updateMeta(name: string, content: string, attribute = "name") {
  const selector = `meta[${attribute}="${name}"]`;
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attribute, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export default function PageShell({ children, title, description }: PageShellProps) {
  const inShell = useInSectionShell();
  const { path } = useLocation();
  // The eight section pages carry the tab row. Whichever layout is drawing the
  // page also draws the row, and the row takes the fixed-navbar clearance with
  // it — so a page never stacks two clearances and never loses the one it needs.
  const showsTabs = isSectionTabPath(path);
  // The dark section canvas belongs to the eight pages themselves, not to the
  // routes nested under them — and on phones, where no shell exists, this is the
  // only place that knows which one is being rendered.
  const navySection = isSectionTabRoot(path);
  // Below `lg` there is no shell, so this layout owns the locked feed scroll
  // outright: the same classes the shell adds on desktop, applied here.
  const feedLocked = isFeedScrollRoot(path);

  useEffect(() => {
    document.title = title;
    if (description) {
      updateMeta("description", description);
      updateMeta("og:description", description, "property");
      updateMeta("twitter:description", description, "name");
    }
    updateMeta("og:title", title, "property");
    updateMeta("og:url", window.location.href, "property");
    updateMeta("og:type", "website", "property");
    updateMeta("twitter:card", "summary", "name");
    updateMeta("twitter:title", title, "name");

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.origin + window.location.pathname;
  }, [description, title]);

  if (inShell) {
    // The shell already supplies the canvas, the navbar and the footer, and it
    // owns the single <main>. Only the fixed-navbar clearance stays here so the
    // page never sits underneath the top bar — and when the shell drew the tab
    // row above this content, that row already carries the clearance.
    //
    // `feed-chain` is the link that lets a locked section page hand its height
    // down from <main> to the card column. It is inert on every other page.
    return <div className={`feed-chain${showsTabs ? "" : " pt-16 sm:pt-20"}`}>{children}</div>;
  }

  return (
    <div
      className={`page-canvas relative min-h-screen isolate${navySection ? " navy-canvas" : ""}${
        feedLocked ? " shell-sections shell-locked feed-locked" : path === "/circle" ? " shell-sections circle-root" : ""
      }`}
    >
      <div className={`shell-chain relative z-10${feedLocked ? " flex flex-col" : ""}`}>
        <Navbar />
        {showsTabs ? <SectionTabs /> : null}
        <main className={`feed-chain${showsTabs ? "" : " pt-16 sm:pt-20"}${navySection ? " section-navy" : ""}`}>
          {children}
        </main>
        {feedLocked ? null : <Footer />}
      </div>
    </div>
  );
}
