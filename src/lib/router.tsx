import { createContext, useContext, useState, useEffect, useCallback, type ReactNode, type MouseEvent } from "react";
import { smoothScrollToElement } from "./motion";

type RouterContextType = {
  path: string;
  search: string;
  navigate: (to: string, opts?: { replace?: boolean }) => void;
};

const RouterContext = createContext<RouterContextType>({
  path: window.location.pathname,
  search: window.location.search,
  navigate: () => {},
});

/** "/explore?q=hindu" → ["/explore", "?q=hindu"] */
function splitLocation(to: string): [string, string] {
  const index = to.search(/[?#]/);
  return index === -1 ? [to, ""] : [to.slice(0, index), to.slice(index)];
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(window.location.pathname);
  const [search, setSearch] = useState(window.location.search);

  useEffect(() => {
    const onPopState = () => {
      setPath(window.location.pathname);
      setSearch(window.location.search);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((to: string, opts?: { replace?: boolean }) => {
    const current = path + search;
    if (to === current) return;
    const [nextPath, nextQuery] = splitLocation(to);
    const url = nextPath + nextQuery;
    if (opts?.replace) {
      window.history.replaceState(null, "", url);
    } else {
      window.history.pushState(null, "", url);
    }
    setPath(nextPath);
    setSearch(nextQuery);
    // Scroll-to-top is handled by PageTransition after exit animation
  }, [path, search]);

  return (
    <RouterContext.Provider value={{ path, search, navigate }}>
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
      href.startsWith("mailto:")
    ) {
      onClick?.(e);
      return;
    }

    // Same-page hash links: scroll explicitly (native fragment scrolling is unreliable here)
    if (href.startsWith("#")) {
      const el = document.getElementById(href.slice(1));
      if (el) {
        e.preventDefault();
        onClick?.(e);
        window.history.pushState(null, "", href);
        smoothScrollToElement(el);
        return;
      }
      onClick?.(e);
      return;
    }

    e.preventDefault();
    onClick?.(e);

    // Handle path#hash links on same page
    if (href.includes("#") && href.startsWith(window.location.pathname)) {
      const hash = href.split("#")[1];
      const el = document.getElementById(hash);
      if (el) {
        smoothScrollToElement(el);
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

