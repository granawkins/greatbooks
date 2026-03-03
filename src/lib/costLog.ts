/**
 * API cost logger — JS equivalent of logs/cost_log.py.
 * Appends one JSON line per call to logs/api_costs.jsonl.
 */

import fs from "fs";
import path from "path";

const COST_FILE = path.join(process.cwd(), "logs/api_costs.jsonl");

type CostRecord = {
  timestamp: string;
  api: string;
  provider: string;
  model: string;
  input_units: number;
  input_unit_type: string;
  cost_usd: number | null;
  entity_type: string | null;
  entity_id: string | null;
  meta?: Record<string, unknown>;
};

export function logCost(params: Omit<CostRecord, "timestamp">): void {
  const record: CostRecord = {
    timestamp: new Date().toISOString(),
    ...params,
  };
  fs.mkdirSync(path.dirname(COST_FILE), { recursive: true });
  fs.appendFileSync(COST_FILE, JSON.stringify(record) + "\n");
}
