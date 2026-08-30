import { useEffect, type ReactNode } from "react";
import Footer from "./Footer";
import InteractiveDotGrid from "./InteractiveDotGrid";
import Navbar from "./Navbar";

type PageShellProps = {
  children: ReactNode;
  title: string;
  description?: string;
};

export default function PageShell({ children, title, description }: PageShellProps) {
  useEffect(() => {
    document.title = title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta && description) meta.setAttribute("content", description);
  }, [description, title]);

  return (
    <div className="relative min-h-screen isolate">
      <InteractiveDotGrid background />
      <div className="relative z-10">
        <Navbar />
        <main className="pt-16 sm:pt-20">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
