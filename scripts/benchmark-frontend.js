#!/usr/bin/env node
/**
 * Frontend benchmark script — measures chapter page load performance.
 *
 * Metrics captured:
 *   1. Server response time (TTFB) for key API routes
 *   2. Client-side fetch count and waterfall (via Puppeteer)
 *   3. Page load timing (FCP, LCP, DOM interactive)
 *   4. Total network requests per page load
 *
 * Usage:
 *   # Start the dev server first: npm run dev
 *   node scripts/benchmark-frontend.js [base-url]
 *
 * Requires: puppeteer (install with: npm i -D puppeteer)
 *
 * Run once on old code, once on new code, compare results.
 */

const BASE = process.argv[2] || "http://localhost:3000";
const CHAPTER_URL = `${BASE}/homer-iliad/1`;
const RUNS = 3;

// ── Part 1: Server response times (no browser needed) ────────────────────────

async function measureEndpoint(url, label) {
  const times = [];
  for (let i = 0; i < RUNS; i++) {
    const start = performance.now();
    const res = await fetch(url);
    await res.arrayBuffer(); // consume body
    times.push(performance.now() - start);
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  return { label, avg: Math.round(avg), times: times.map(Math.round) };
}

async function serverBenchmarks() {
  console.log("\n═══ Server Response Times (avg of %d runs) ═══\n", RUNS);
  const endpoints = [
    [`${BASE}/api/books`, "GET /api/books"],
    [`${BASE}/api/books/homer-iliad`, "GET /api/books/homer-iliad"],
    [`${BASE}/api/books/homer-iliad/chapters/1`, "GET /api/books/.../chapters/1"],
    [`${BASE}/api/auth/me`, "GET /api/auth/me"],
    [`${BASE}/api/progress`, "GET /api/progress"],
  ];

  for (const [url, label] of endpoints) {
    try {
      const result = await measureEndpoint(url, label);
      console.log(
        "  %s: %dms (runs: %s)",
        result.label.padEnd(35),
        result.avg,
        result.times.join(", ")
      );
    } catch (e) {
      console.log("  %s: FAILED (%s)", label.padEnd(35), e.message);
    }
  }
}

// ── Part 2: Browser-based page load metrics ──────────────────────────────────

async function browserBenchmarks() {
  let puppeteer;
  try {
    puppeteer = await import("puppeteer");
  } catch {
    console.log("\n═══ Browser Metrics: SKIPPED (install puppeteer: npm i -D puppeteer) ═══\n");
    return;
  }

  console.log("\n═══ Browser Page Load Metrics (avg of %d runs) ═══\n", RUNS);
  console.log("  URL: %s\n", CHAPTER_URL);

  const allResults = [];

  for (let run = 0; run < RUNS; run++) {
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    // Track all network requests
    const requests = [];
    const apiRequests = [];

    page.on("request", (req) => {
      requests.push({
        url: req.url(),
        method: req.method(),
        startTime: Date.now(),
      });
    });

    page.on("response", (res) => {
      const url = res.url();
      if (url.includes("/api/")) {
        apiRequests.push({
          url: url.replace(BASE, ""),
          status: res.status(),
          time: Date.now(),
        });
      }
    });

    // Navigate and wait for network idle
    const navStart = Date.now();
    await page.goto(CHAPTER_URL, { waitUntil: "networkidle0", timeout: 30000 });
    const loadTime = Date.now() - navStart;

    // Get performance timing
    const timing = await page.evaluate(() => {
      const perf = performance.getEntriesByType("navigation")[0];
      const fcp = performance.getEntriesByName("first-contentful-paint")[0];
      const lcp = new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          resolve(entries[entries.length - 1]?.startTime ?? null);
        }).observe({ type: "largest-contentful-paint", buffered: true });
        setTimeout(() => resolve(null), 1000);
      });
      return {
        domInteractive: Math.round(perf?.domInteractive ?? 0),
        domComplete: Math.round(perf?.domComplete ?? 0),
        fcp: Math.round(fcp?.startTime ?? 0),
        transferSize: Math.round((perf?.transferSize ?? 0) / 1024),
      };
    });

    allResults.push({
      loadTime,
      totalRequests: requests.length,
      apiRequests: apiRequests.length,
      apiCalls: apiRequests.map((r) => `${r.url}`),
      ...timing,
    });

    await browser.close();
  }

  // Aggregate
  const avg = (key) =>
    Math.round(allResults.reduce((s, r) => s + r[key], 0) / RUNS);

  console.log("  Total load time:     %dms", avg("loadTime"));
  console.log("  DOM Interactive:     %dms", avg("domInteractive"));
  console.log("  DOM Complete:        %dms", avg("domComplete"));
  console.log("  FCP:                 %dms", avg("fcp"));
  console.log("  HTML transfer size:  %dKB", avg("transferSize"));
  console.log("  Total requests:      %d", avg("totalRequests"));
  console.log("  API requests:        %d", avg("apiRequests"));

  // Show unique API calls from last run
  const lastRun = allResults[allResults.length - 1];
  const uniqueApis = [...new Set(lastRun.apiCalls)];
  console.log("\n  API calls made during page load:");
  for (const api of uniqueApis) {
    const count = lastRun.apiCalls.filter((a) => a === api).length;
    console.log("    %s%s", api, count > 1 ? ` (×${count})` : "");
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║       Great Books Frontend Benchmark            ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log("  Base URL: %s", BASE);
  console.log("  Runs per test: %d", RUNS);

  await serverBenchmarks();
  await browserBenchmarks();

  console.log("\n  Done. Run this script on both old and new code to compare.\n");
}

main().catch(console.error);
