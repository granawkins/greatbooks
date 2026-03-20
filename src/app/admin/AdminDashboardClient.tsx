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

const ACCENT = "#C4A97D";
const ACCENT2 = "#7D9EC4";
const BG = "#141311";
const BG2 = "#1E1C19";
const BG3 = "#2A2722";
const BORDER = "#302C25";
const TEXT = "#E5E0D8";
const TEXT2 = "#9A9184";
const PIE_COLORS = [ACCENT, ACCENT2, "#C47D9E", "#7DC4A9"];

function shortDate(d: string) {
  const [, m, day] = d.split("-");
  return `${parseInt(m)}/${parseInt(day)}`;
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div style={{
      background: BG2,
      border: `1px solid ${BORDER}`,
      borderRadius: 8,
      padding: "20px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 4,
    }}>
      <div style={{ color: TEXT2, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ color: TEXT, fontSize: 32, fontWeight: 600 }}>{value.toLocaleString()}</div>
      {sub && <div style={{ color: ACCENT, fontSize: 12 }}>{sub}</div>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: BG2,
      border: `1px solid ${BORDER}`,
      borderRadius: 8,
      padding: "20px 24px",
    }}>
      <div style={{ color: TEXT, fontSize: 14, fontWeight: 600, marginBottom: 16, letterSpacing: "0.04em" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

const tooltipStyle = {
  contentStyle: { background: BG3, border: `1px solid ${BORDER}`, borderRadius: 6, color: TEXT, fontSize: 12 },
  cursor: { fill: "rgba(196,169,125,0.08)" },
};

export default function AdminDashboardClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [charts, setCharts] = useState<Charts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState("");

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

  if (error) {
    return (
      <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: TEXT }}>
        Error: {error}
      </div>
    );
  }

  if (!stats || !charts) {
    return (
      <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: TEXT2 }}>
        Loading…
      </div>
    );
  }

  // Fill in zero-count dates for line/bar charts
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
    <div style={{ background: BG, minHeight: "100vh", padding: "32px 24px", fontFamily: "inherit" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ color: ACCENT, fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: "0.04em" }}>
            Admin Dashboard
          </h1>
          <div style={{ color: TEXT2, fontSize: 12, marginTop: 6 }}>{now}</div>
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

          {/* Daily signups */}
          <ChartCard title="Daily Signups — last 30 days">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={signups} barSize={6}>
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: TEXT2, fontSize: 10 }} tickLine={false} axisLine={false} interval={6} />
                <YAxis tick={{ fill: TEXT2, fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} width={24} />
                <Tooltip {...tooltipStyle} formatter={(v) => [v, "signups"]} labelFormatter={(l) => l} />
                <Bar dataKey="count" fill={ACCENT} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Daily sessions */}
          <ChartCard title="Daily Sessions — last 30 days">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={sessions} barSize={6}>
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: TEXT2, fontSize: 10 }} tickLine={false} axisLine={false} interval={6} />
                <YAxis tick={{ fill: TEXT2, fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} width={24} />
                <Tooltip {...tooltipStyle} formatter={(v) => [v, "sessions"]} labelFormatter={(l) => l} />
                <Bar dataKey="count" fill={ACCENT2} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Chat messages per day */}
          <ChartCard title="Chat Messages — last 30 days">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={messages}>
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: TEXT2, fontSize: 10 }} tickLine={false} axisLine={false} interval={6} />
                <YAxis tick={{ fill: TEXT2, fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} width={24} />
                <Tooltip {...tooltipStyle} formatter={(v) => [v, "messages"]} labelFormatter={(l) => l} />
                <Line type="monotone" dataKey="count" stroke={ACCENT} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Sessions by mode */}
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
                  label={(props) => {
                    const pct = typeof props.percent === "number" ? (props.percent * 100).toFixed(0) : "0";
                    return `${props.name ?? ""} ${pct}%`;
                  }}
                  labelLine={false}
                >
                  {charts.sessionsByMode.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend formatter={(v) => <span style={{ color: TEXT2, fontSize: 12 }}>{v}</span>} />
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
                <XAxis type="number" tick={{ fill: TEXT2, fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="title"
                  tick={{ fill: TEXT2, fontSize: 11 }}
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
