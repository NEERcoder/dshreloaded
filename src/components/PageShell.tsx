import { createContext, useContext, useEffect, type ReactNode } from "react";
import Footer from "./Footer";
import type { BackgroundPreset } from "./InteractiveDotGrid";
import Navbar from "./Navbar";

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
    // page never sits underneath the top bar.
    return <div className="pt-16 sm:pt-20">{children}</div>;
  }

  return (
    <div className="page-canvas relative min-h-screen isolate">
      <div className="relative z-10">
        <Navbar />
        <main className="pt-16 sm:pt-20">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
