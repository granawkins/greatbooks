"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";

type Stats = {
  totalUsers: number;
  usersWithEmail: number;
  totalSessions: number;
  totalMessages: number;
  newUsersLast7: number;
  sessionsLast7: number;
};

type Charts = {
  dailySignups: { date: string; count: number }[];
  dailySessions: { date: string; count: number }[];
  sessionsByBook: { book_id: string; title: string; count: number }[];
  sessionsByMode: { mode: string; count: number }[];
  messagesPerDay: { date: string; count: number }[];
};

// Chart colours that work in both light and dark mode
const ACCENT = "var(--color-accent)";
const ACCENT2 = "#7D9EC4";
const PIE_COLORS = ["var(--color-accent)", "#7D9EC4", "#C47D9E", "#7DC4A9"];

function shortDate(d: string) {
  const [, m, day] = d.split("-");
  return `${parseInt(m)}/${parseInt(day)}`;
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div style={{
      background: "var(--color-bg-secondary)",
      border: "1px solid var(--color-border)",
      borderRadius: 8,
      padding: "20px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 4,
    }}>
      <div style={{ color: "var(--color-text-secondary)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ color: "var(--color-text)", fontSize: 32, fontWeight: 600 }}>{value.toLocaleString()}</div>
      {sub && <div style={{ color: "var(--color-accent)", fontSize: 12 }}>{sub}</div>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--color-bg-secondary)",
      border: "1px solid var(--color-border)",
      borderRadius: 8,
      padding: "20px 24px",
    }}>
      <div style={{ color: "var(--color-text)", fontSize: 14, fontWeight: 600, marginBottom: 16, letterSpacing: "0.04em" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// Recharts tooltip needs explicit hex colours (can't use CSS vars inside SVG context)
// We read them at render time from the document root.
function useComputedColors() {
  const [colors, setColors] = useState({
    bg3: "#2A2722",
    border: "#302C25",
    text: "#E5E0D8",
    textSecondary: "#9A9184",
  });

  useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    setColors({
      bg3: style.getPropertyValue("--color-bg-tertiary").trim() || "#2A2722",
      border: style.getPropertyValue("--color-border").trim() || "#302C25",
      text: style.getPropertyValue("--color-text").trim() || "#E5E0D8",
      textSecondary: style.getPropertyValue("--color-text-secondary").trim() || "#9A9184",
    });
  }, []);

  return colors;
}

export default function AdminDashboardClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [charts, setCharts] = useState<Charts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState("");
  const c = useComputedColors();

  useEffect(() => {
    setNow(new Date().toUTCString());
    fetch("/api/admin/stats", { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Forbidden");
        return r.json();
      })
      .then((d) => {
        setStats(d.stats);
        setCharts(d.charts);
      })
      .catch((e) => setError(e.message));
  }, []);

  const tooltipStyle = {
    contentStyle: { background: c.bg3, border: `1px solid ${c.border}`, borderRadius: 6, color: c.text, fontSize: 12 },
    cursor: { fill: "rgba(128,128,128,0.08)" },
  };

  if (error) {
    return (
      <div style={{ background: "var(--color-bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text)" }}>
        Error: {error}
      </div>
    );
  }

  if (!stats || !charts) {
    return (
      <div style={{ background: "var(--color-bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-secondary)" }}>
        Loading…
      </div>
    );
  }

  function fillDates(data: { date: string; count: number }[]) {
    const map = Object.fromEntries(data.map((d) => [d.date, d.count]));
    const result: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push({ date: key, count: map[key] ?? 0 });
    }
    return result;
  }

  const signups = fillDates(charts.dailySignups);
  const sessions = fillDates(charts.dailySessions);
  const messages = fillDates(charts.messagesPerDay);

  return (
    <div style={{ background: "var(--color-bg)", minHeight: "100vh", padding: "32px 24px", fontFamily: "inherit" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ color: "var(--color-accent)", fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: "0.04em" }}>
            Admin Dashboard
          </h1>
          <div style={{ color: "var(--color-text-secondary)", fontSize: 12, marginTop: 6 }}>{now}</div>
        </div>

        {/* Stat cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 12,
          marginBottom: 32,
        }}>
          <StatCard label="Total Users" value={stats.totalUsers} />
          <StatCard label="Signed In" value={stats.usersWithEmail} sub="have email" />
          <StatCard label="New (7d)" value={stats.newUsersLast7} sub="signups" />
          <StatCard label="Sessions" value={stats.totalSessions} />
          <StatCard label="Sessions (7d)" value={stats.sessionsLast7} />
          <StatCard label="Chat Messages" value={stats.totalMessages} />
        </div>

        {/* Charts grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

          <ChartCard title="Daily Signups — last 30 days">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={signups} barSize={6}>
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: c.textSecondary, fontSize: 10 }} tickLine={false} axisLine={false} interval={6} />
                <YAxis tick={{ fill: c.textSecondary, fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} width={24} />
                <Tooltip {...tooltipStyle} formatter={(v) => [v, "signups"]} labelFormatter={(l) => l} />
                <Bar dataKey="count" fill={ACCENT} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Daily Sessions — last 30 days">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={sessions} barSize={6}>
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: c.textSecondary, fontSize: 10 }} tickLine={false} axisLine={false} interval={6} />
                <YAxis tick={{ fill: c.textSecondary, fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} width={24} />
                <Tooltip {...tooltipStyle} formatter={(v) => [v, "sessions"]} labelFormatter={(l) => l} />
                <Bar dataKey="count" fill={ACCENT2} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Chat Messages — last 30 days">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={messages}>
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: c.textSecondary, fontSize: 10 }} tickLine={false} axisLine={false} interval={6} />
                <YAxis tick={{ fill: c.textSecondary, fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} width={24} />
                <Tooltip {...tooltipStyle} formatter={(v) => [v, "messages"]} labelFormatter={(l) => l} />
                <Line type="monotone" dataKey="count" stroke={ACCENT} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Sessions by Mode">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={charts.sessionsByMode}
                  dataKey="count"
                  nameKey="mode"
                  cx="50%"
                  cy="50%"
                  outerRadius={65}
                  labelLine={false}
                >
                  {charts.sessionsByMode.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend formatter={(v) => <span style={{ color: c.textSecondary, fontSize: 12 }}>{v}</span>} />
                <Tooltip {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

        </div>

        {/* Sessions by book — full width */}
        <div style={{ marginTop: 16 }}>
          <ChartCard title="Sessions by Book">
            <ResponsiveContainer width="100%" height={Math.max(200, charts.sessionsByBook.length * 32)}>
              <BarChart data={charts.sessionsByBook} layout="vertical" barSize={14}>
                <XAxis type="number" tick={{ fill: c.textSecondary, fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="title"
                  tick={{ fill: c.textSecondary, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={180}
                  tickFormatter={(v) => v?.length > 28 ? v.slice(0, 28) + "…" : v}
                />
                <Tooltip {...tooltipStyle} formatter={(v) => [v, "sessions"]} />
                <Bar dataKey="count" fill={ACCENT} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

      </div>
    </div>
  );
}
