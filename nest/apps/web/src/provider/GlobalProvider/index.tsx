import type { ReactNode } from "react";

interface GlobalProviderProps {
  children: ReactNode;
}

export default function GlobalProvider({ children }: GlobalProviderProps) {
  return <>{children}</>;
}
