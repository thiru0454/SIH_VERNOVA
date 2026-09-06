"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Mic, NotebookPen } from "lucide-react";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/translate", label: "Translate", icon: Mic },
  { href: "/worksheet", label: "Worksheets", icon: NotebookPen },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="absolute bottom-0 left-0 right-0 flex items-stretch"
      style={{ background: "var(--color-indigo-light)" }}
    >
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors"
            style={{
              color: active ? "var(--color-mustard)" : "rgba(241,236,224,0.55)",
            }}
          >
            <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
            <span className="text-[11px] font-medium tracking-tight">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
