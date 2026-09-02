import { createContext, useContext, useState, useEffect, useCallback, type ReactNode, type MouseEvent } from "react";

type RouterContextType = {
  path: string;
  navigate: (to: string, opts?: { replace?: boolean }) => void;
};

const RouterContext = createContext<RouterContextType>({
  path: window.location.pathname,
  navigate: () => {},
});

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((to: string, opts?: { replace?: boolean }) => {
    if (to === path) return;
    if (opts?.replace) {
      window.history.replaceState(null, "", to);
    } else {
      window.history.pushState(null, "", to);
    }
    setPath(to);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [path]);

  return (
    <RouterContext.Provider value={{ path, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useLocation() {
  return useContext(RouterContext);
}

type LinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  children: ReactNode;
};

import { forwardRef } from "react";

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { href, onClick, children, ...props },
  ref
) {
  const { navigate } = useLocation();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Allow normal behavior for external links, new tabs, modified clicks
    if (
      e.metaKey || e.ctrlKey || e.shiftKey || e.altKey ||
      e.button !== 0 ||
      props.target === "_blank" ||
      href.startsWith("http") ||
      href.startsWith("mailto:") ||
      href.startsWith("#")
    ) {
      onClick?.(e);
      return;
    }

    e.preventDefault();
    onClick?.(e);

    // Handle hash links on same page
    if (href.includes("#") && href.startsWith(window.location.pathname)) {
      const hash = href.split("#")[1];
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }

    navigate(href);
  };

  return (
    <a href={href} ref={ref} onClick={handleClick} {...props}>
      {children}
    </a>
  );
});

