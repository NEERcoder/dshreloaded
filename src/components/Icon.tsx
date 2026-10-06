import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { name: string };

const paths: Record<string, JSX.Element> = {
  building: (
    <>
      <path d="M3 21h18" />
      <path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" />
      <path d="M15 21V9h2a2 2 0 0 1 2 2v10" />
      <path d="M9 7h2M9 11h2M9 15h2" />
    </>
  ),
  play: (
    <>
      <rect x="2.5" y="4" width="19" height="16" rx="3" />
      <path d="M10 9.5v5l4-2.5z" fill="currentColor" stroke="none" />
    </>
  ),
  star: (
    <>
      <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 11a3 3 0 0 0 0-6" />
      <path d="M17 20a5.5 5.5 0 0 0-3-4.9" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <path d="M12 17v4M8 21h8" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2 0-1.5-1-1.5-1-3 0-1 1-2 2-2h1a5 5 0 0 0 5-5c0-3.9-4-6-9-6z" />
      <circle cx="7.5" cy="11" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  pen: (
    <>
      <path d="M14 4l6 6-9 9-6 .8.8-6z" />
      <path d="M13 5l6 6" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18" />
      <path d="M11 12v2h2v-2" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v4a5 5 0 0 1-10 0z" />
      <path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3" />
      <path d="M9 13l-1 4h8l-1-4M8 21h8" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="9" r="5" />
      <path d="M9 13l-1.5 8L12 19l4.5 2L15 13" />
    </>
  ),
  flask: (
    <>
      <path d="M9 3h6M10 3v6L5 19a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 19l-5-10V3" />
      <path d="M7.5 14h9" />
    </>
  ),
  gift: (
    <>
      <rect x="3" y="9" width="18" height="12" rx="1" />
      <path d="M3 13h18M12 9v12" />
      <path d="M12 9S10.5 3 8 3a2.5 2.5 0 0 0 0 6M12 9s1.5-6 4-6a2.5 2.5 0 0 1 0 6" />
    </>
  ),
  youtube: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="4" />
      <path d="M10 9.5l5 2.5-5 2.5z" fill="currentColor" stroke="none" />
    </>
  ),
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  phone: (
    <>
      <path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 006 6l1.5-2 4 1.5v3a2 2 0 01-2.2 2A16.5 16.5 0 014.5 5.7 2 2 0 016.5 3.5z" />
    </>
  ),
  home: (
    <>
      <path d="M3.5 10.5L12 3.5l8.5 7" />
      <path d="M5.5 9v10a1 1 0 001 1h10a1 1 0 001-1V9" />
      <path d="M9.5 20v-6h5v6" />
    </>
  ),
  arrow: (
    <>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12M18 6L6 18" />
    </>
  ),
  flag: (
    <>
      <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </>
  ),
  filter: (
    <>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </>
  ),
  bell: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 4.5 1.5 6 1.5 6h-15S6 13.5 6 9" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),

  /* ---- account / navigation ---- */
  user: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
    </>
  ),
  logout: (
    <>
      <path d="M14 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M9 8l-4 4 4 4M5 12h9" />
    </>
  ),
  "chevron-down": <path d="M6 9.5l6 6 6-6" />,
  "arrow-left": <path d="M19 12H5M11 6l-6 6 6 6" />,
  "external": (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4l-9 9" />
      <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
    </>
  ),

  /* ---- opportunities ---- */
  book: (
    <>
      <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
      <path d="M4 19a2 2 0 0 1 2-2h13" />
    </>
  ),
  code: (
    <>
      <path d="M9 8l-4 4 4 4M15 8l4 4-4 4" />
    </>
  ),
  presentation: (
    <>
      <path d="M3 4h18M4 4v10h16V4" />
      <path d="M12 14v4M9 21l3-3 3 3" />
      <path d="M8 11l2.5-2.5 2 2L16 7" />
    </>
  ),
  "graduation-cap": (
    <>
      <path d="M2.5 8.5L12 4.5l9.5 4-9.5 4z" />
      <path d="M6.5 10.5V15c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-4.5" />
      <path d="M21.5 8.5v5" />
    </>
  ),
  heart: (
    <>
      <path d="M12 20s-7.5-4.4-7.5-9.4A4.1 4.1 0 0 1 12 8.2a4.1 4.1 0 0 1 7.5 2.4c0 5-7.5 9.4-7.5 9.4z" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3.2 2" />
    </>
  ),
  "map-pin": (
    <>
      <path d="M12 21s6.5-5.6 6.5-10a6.5 6.5 0 1 0-13 0c0 4.4 6.5 10 6.5 10z" />
      <circle cx="12" cy="11" r="2.3" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2.5" />
      <path d="M3 10h18" />
      <circle cx="16.5" cy="14.5" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  monitor: (
    <>
      <rect x="2.5" y="4" width="19" height="12.5" rx="2" />
      <path d="M9 20.5h6M12 16.5v4" />
    </>
  ),

  /* ---- social / content ---- */
  link: (
    <>
      <path d="M10.5 13.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5L11.7 7.7" />
      <path d="M13.5 10.5a3.5 3.5 0 0 0-5 0L6 13a3.5 3.5 0 0 0 5 5l1.3-1.2" />
    </>
  ),
  message: (
    <>
      <path d="M20 12.5a7.5 7.5 0 0 1-7.5 7.5H4l2-2.6A7.5 7.5 0 1 1 20 12.5z" />
      <path d="M9 11h6M9 14h4" />
    </>
  ),

  /* ---- create / edit / manage ---- */
  plus: <path d="M12 5v14M5 12h14" />,
  trash: (
    <>
      <path d="M4 7h16M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2" />
      <path d="M6.5 7l.9 12a2 2 0 0 0 2 1.9h5.2a2 2 0 0 0 2-1.9l.9-12" />
      <path d="M10.5 11v6M13.5 11v6" />
    </>
  ),
  bookmark: <path d="M6.5 3.5h11V21l-5.5-3.8L6.5 21z" />,
  share: (
    <>
      <circle cx="18" cy="5.5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="18.5" r="2.5" />
      <path d="M8.2 10.8l7.6-4M8.2 13.2l7.6 4" />
    </>
  ),
  download: (
    <>
      <path d="M12 3.5v11M8 11l4 4 4-4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </>
  ),
  upload: (
    <>
      <path d="M12 15V4M8 7.5l4-4 4 4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </>
  ),
  send: (
    <>
      <path d="M21 3.5L10.5 14" />
      <path d="M21 3.5l-6.8 17-3.7-6.5-6.5-3.7z" />
    </>
  ),
  handshake: (
    <>
      <path d="M2.5 9.5l3.5-3h4l2 1.7 2-1.7h4l3.5 3" />
      <path d="M6 6.5v7.2a1.8 1.8 0 001.8 1.8h.7l1.8-1.8" />
      <path d="M18 6.5v7.2a1.8 1.8 0 01-1.8 1.8h-.7L13.7 13.7" />
      <path d="M9.5 15.5l1.6 1.6a1.2 1.2 0 001.8 0l1.6-1.6" />
    </>
  ),

  /* ---- status ---- */
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8 12.3l2.7 2.7L16 9.7" />
    </>
  ),
  "alert-circle": (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.8v5" />
      <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  "alert-triangle": (
    <>
      <path d="M12 3.8l8.6 15.2H3.4z" />
      <path d="M12 9.5v4" />
      <circle cx="12" cy="16.3" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11.5v5" />
      <circle cx="12" cy="8" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  loader: (
    <>
      <path d="M12 3.5v3.6M12 16.9v3.6M3.5 12h3.6M16.9 12h3.6" />
      <path d="M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <circle cx="8.5" cy="10" r="1.6" />
      <path d="M3.5 17l4.5-4.5 3.5 3.5 3-3 6 5.5" />
    </>
  ),
};

export default function Icon({ name, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name] ?? null}
    </svg>
  );
}
