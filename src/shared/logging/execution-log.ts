/**
 * Structured one-line logs for the execution domain (`scope: execution`).
 * Uses `console` only — aligns with `scripts/lib/logger.js` spirit (prefix + timestamp), JSON for grep/parsing.
 */

type ExecutionLogFields = Record<string, string | number | boolean | undefined | null>;

function base(event: string, fields: ExecutionLogFields) {
  return {
    ts: new Date().toISOString(),
    scope: 'execution' as const,
    event,
    ...fields,
  };
}

export const executionLog = {
  info(event: string, fields: ExecutionLogFields = {}) {
    console.log(JSON.stringify(base(event, fields)));
  },

  warn(event: string, fields: ExecutionLogFields = {}) {
    console.warn(JSON.stringify({ ...base(event, fields), level: 'warn' }));
  },

  error(event: string, fields: ExecutionLogFields = {}, err?: unknown) {
    const payload: Record<string, unknown> = { ...base(event, fields), level: 'error' };
    if (err instanceof Error) {
      payload.error = err.message;
      payload.stack = err.stack;
    } else if (err !== undefined) {
      payload.error = String(err);
    }
    console.error(JSON.stringify(payload));
  },
};
