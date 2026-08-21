import fs from 'fs';
import path from 'path';
import { INSTANCE_ID } from './leader.js';

/**
 * Append-only event trail, on disk - deliberately NOT in the database.
 *
 * One file per day per replica (audit-2026-08-22-api-1.jsonl). Per-replica files
 * mean two processes never interleave writes into the same file; merge them with
 * `cat` when reading. Lines are JSON objects, one per event, so `jq` can filter.
 */
const LOG_DIR = process.env.AUDIT_LOG_DIR
  ? path.resolve(process.env.AUDIT_LOG_DIR)
  : path.join(process.cwd(), 'logs');

const FLUSH_INTERVAL_MS = 1000;
const FLUSH_AT_LINES = 50;
const RETENTION_DAYS = Number(process.env.AUDIT_RETENTION_DAYS || 30);

let buffer: string[] = [];
let timer: NodeJS.Timeout | null = null;

function fileFor(when: Date): string {
  const day = when.toISOString().slice(0, 10);
  return path.join(LOG_DIR, `audit-${day}-${INSTANCE_ID}.jsonl`);
}

export function initAuditLog(): void {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function flush(): void {
  if (buffer.length === 0) return;
  const lines = buffer;
  buffer = [];
  try {
    fs.appendFileSync(fileFor(new Date()), lines.join(''));
  } catch (err: any) {
    console.error(`[Audit] write failed, ${lines.length} event(s) lost: ${err.message}`);
  }
}

/** Records one event. Never throws - logging must not break a request. */
export function auditLog(event: Record<string, unknown>): void {
  try {
    buffer.push(JSON.stringify({ ts: new Date().toISOString(), instance: INSTANCE_ID, ...event }) + '\n');

    if (buffer.length >= FLUSH_AT_LINES) {
      flush();
      return;
    }
    if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        flush();
      }, FLUSH_INTERVAL_MS);
      timer.unref?.();
    }
  } catch {
    /* an unserialisable event is not worth crashing over */
  }
}

export function flushAuditLog(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  flush();
}

/** Deletes trail files older than AUDIT_RETENTION_DAYS. Leader-only. */
export async function pruneAuditLogs(): Promise<number> {
  try {
    const files = await fs.promises.readdir(LOG_DIR).catch(() => [] as string[]);
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    let removed = 0;

    for (const name of files) {
      if (!name.startsWith('audit-') || !name.endsWith('.jsonl')) continue;
      const day = Date.parse(name.slice(6, 16));
      if (Number.isNaN(day) || day >= cutoff) continue;
      await fs.promises.unlink(path.join(LOG_DIR, name)).catch(() => {});
      removed++;
    }

    if (removed) console.log(`[Audit] pruned ${removed} expired trail file(s).`);
    return removed;
  } catch (err: any) {
    console.error(`[Audit] prune failed: ${err.message}`);
    return 0;
  }
}

export const AUDIT_LOG_DIR = LOG_DIR;
