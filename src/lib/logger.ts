/**
 * Minimal structured logger that never prints secrets. Context objects are
 * shallow-redacted by key name, and Error objects are reduced to name, message
 * and (non-production) stack.
 */

type Level = 'debug' | 'info' | 'warn' | 'error';
type Context = Record<string, unknown>;

// Secrets are never logged, and neither is personal data (LGPD): e-mail and IP
// addresses are dropped by key name as well.
const SENSITIVE_KEY =
  /pass(word)?|secret|token|authorization|cookie|session|api[-_]?key|access[-_]?key|jwt|signed[-_]?url|database[-_]?url|connection|e-?mail|^ip$|ip[-_]?address|totp|backup[-_]?code/i;

function redactValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEY.test(key)) return '[redacted]';
  if (value instanceof Error) return serializeError(value);
  if (typeof value === 'string' && value.length > 500) return `${value.slice(0, 500)}…`;
  return value;
}

function serializeError(error: Error): Context {
  const base: Context = { name: error.name, message: error.message };
  const code = (error as { code?: unknown }).code;
  if (typeof code === 'string') base.code = code;
  if (process.env.NODE_ENV !== 'production' && error.stack) base.stack = error.stack.split('\n').slice(0, 6).join('\n');
  return base;
}

function redact(context: Context | undefined): Context | undefined {
  if (!context) return undefined;
  return Object.fromEntries(Object.entries(context).map(([key, value]) => [key, redactValue(key, value)]));
}

function write(level: Level, scope: string, message: string, context?: Context) {
  if (level === 'debug' && process.env.NODE_ENV === 'production') return;
  const entry = { level, scope, message, ...redact(context) };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export function createLogger(scope: string) {
  return {
    debug: (message: string, context?: Context) => write('debug', scope, message, context),
    info: (message: string, context?: Context) => write('info', scope, message, context),
    warn: (message: string, context?: Context) => write('warn', scope, message, context),
    error: (message: string, context?: Context) => write('error', scope, message, context),
  };
}

/** Converts unknown thrown values (including Postgres and Better Auth errors) to a loggable shape. */
export function describeError(error: unknown): Context {
  if (error instanceof Error) return serializeError(error);
  if (error && typeof error === 'object') {
    const { message, code, details, hint, status, statusCode } = error as Record<string, unknown>;
    return { message, code, details, hint, status: status ?? statusCode };
  }
  return { message: String(error) };
}
