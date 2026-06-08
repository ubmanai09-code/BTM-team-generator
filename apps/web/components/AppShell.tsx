"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const generateSections = [
  { key: "import", label: "Data Import" },
  { key: "settings", label: "Team Settings" },
  { key: "setup", label: "Setup Check" },
  { key: "generate", label: "Generate Action" },
  { key: "edit", label: "Team Edit" },
  { key: "export", label: "Export Data" }
] as const;

const navItems = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    )
  },
  {
    href: "/admin/generate",
    label: "Generate Teams",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    )
  }
];

export function AppShell({ children }: { children: React.ReactNode }): JSX.Element {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const isGenerateRoute = pathname === "/admin/generate";
  const [currentGenerateSection, setCurrentGenerateSection] = useState<string>("import");

  useEffect(() => {
    const syncSectionFromUrl = (): void => {
      const section = new URLSearchParams(window.location.search).get("section") ?? "import";
      setCurrentGenerateSection(section);
    };

    syncSectionFromUrl();
    window.addEventListener("popstate", syncSectionFromUrl);
    return () => window.removeEventListener("popstate", syncSectionFromUrl);
  }, [pathname]);

  return (
    <div className={`shell${collapsed ? " shell--collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar__header">
          {!collapsed && (
            <div className="sidebar__brand">
              <img className="sidebar__brand-icon" src="/logo.png" alt="BTM Logo" width={24} height={24} />
              <span className="sidebar__brand-text">BTM Generator</span>
            </div>
          )}
          <button
            className="sidebar__toggle"
            onClick={() => setCollapsed((prev) => !prev)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            )}
          </button>
        </div>

        <nav className="sidebar__nav">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={`sidebar__link${active ? " sidebar__link--active" : ""}`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="sidebar__link-icon">{item.icon}</span>
                  {!collapsed && <span className="sidebar__link-label">{item.label}</span>}
                </Link>
                {!collapsed && item.href === "/admin/generate" && isGenerateRoute ? (
                  <div className="sidebar__subnav">
                    {generateSections.map((section) => (
                      <Link
                        key={section.key}
                        href={`/admin/generate?section=${section.key}`}
                        className={`sidebar__sublink${currentGenerateSection === section.key ? " sidebar__sublink--active" : ""}`}
                        onClick={() => setCurrentGenerateSection(section.key)}
                      >
                        {section.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="sidebar__footer">
            <p className="sidebar__footer-text">BTM · Team Balance</p>
          </div>
        )}
      </aside>

      <div className="shell__content">
        <header className="topbar">
          <div className="topbar__title">
            {navItems.find((item) => item.href === pathname)?.label ?? "BTM Team Generator"}
          </div>
          <div className="topbar__actions">
            <span className="topbar__badge">Admin</span>
          </div>
        </header>
        <main className="page-body">{children}</main>
      </div>
    </div>
  );
}
