import { useEffect, type ReactNode } from "react";
import Footer from "./Footer";
import InteractiveDotGrid, { type BackgroundPreset } from "./InteractiveDotGrid";
import Navbar from "./Navbar";

type PageShellProps = {
  children: ReactNode;
  title: string;
  description?: string;
  backgroundPreset?: BackgroundPreset;
};

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

export default function PageShell({ children, title, description, backgroundPreset = "explore" }: PageShellProps) {
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

  return (
    <div className="relative min-h-screen isolate">
      <InteractiveDotGrid background preset={backgroundPreset} />
      <div className="relative z-10">
        <Navbar />
        <main className="pt-16 sm:pt-20">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
