import Link from "next/link";

export function AdminHeader(): JSX.Element {
  return (
    <header className="card" style={{ marginBottom: 16 }}>
      <h1 style={{ margin: 0, fontSize: "2rem" }}>BTM Team Balance Admin</h1>
      <p style={{ color: "var(--muted)", marginTop: 8 }}>
        Generate, simulate, and override team allocation with fairness analytics.
      </p>
      <nav style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link className="btn ghost" href="/admin">
          Dashboard
        </Link>
        <Link className="btn ghost" href="/admin/generate">
          Run Generator
        </Link>
      </nav>
    </header>
  );
}
