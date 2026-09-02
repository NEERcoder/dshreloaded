import { createContext, useContext, useState, type ReactNode } from "react";

export type CursorType = "default" | "hover" | "explore" | "play" | "view" | "join" | "open";

type CursorContextType = {
  cursorType: CursorType;
  setCursorType: (type: CursorType) => void;
};

const CursorContext = createContext<CursorContextType>({
  cursorType: "default",
  setCursorType: () => {},
});

export function CursorProvider({ children }: { children: ReactNode }) {
  const [cursorType, setCursorType] = useState<CursorType>("default");

  return (
    <CursorContext.Provider value={{ cursorType, setCursorType }}>
      {children}
    </CursorContext.Provider>
  );
}

export function useCursor() {
  return useContext(CursorContext);
}
