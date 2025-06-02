import { ReactNode } from "react";

interface Windows95LayoutProps {
  children: ReactNode;
}

export default function Windows95Layout({ children }: Windows95LayoutProps) {
  return (
    <div className="desktop">
      {children}
    </div>
  );
}
