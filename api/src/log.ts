type Level = 'DEBUG' | 'INFO' | 'ERROR';
const LEVEL_RANK: Record<Level, number> = { DEBUG: 10, INFO: 20, ERROR: 30 };

function curLevel(): Level {
  const lv = String(process.env.LOG_LEVEL || 'INFO').toUpperCase();
  return (['DEBUG','INFO','ERROR'] as Level[]).includes(lv as Level) ? (lv as Level) : 'INFO';
}

function shouldLog(level: Level): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[curLevel()];
}

function fmt(scope: string, level: Level, msg: string, extra?: Record<string, any>) {
  const base = `[${new Date().toISOString()}] [${level}] [${scope}] ${msg}`;
  if (!extra) return base;
  try { return `${base} :: ${JSON.stringify(extra)}`; } catch { return base; }
}

export function logDebug(scope: string, msg: string, extra?: Record<string, any>) {
  if (!shouldLog('DEBUG')) return;
  // eslint-disable-next-line no-console
  console.log(fmt(scope, 'DEBUG', msg, extra));
}

export function logInfo(scope: string, msg: string, extra?: Record<string, any>) {
  if (!shouldLog('INFO')) return;
  // eslint-disable-next-line no-console
  console.log(fmt(scope, 'INFO', msg, extra));
}

export function logError(scope: string, msg: string, extra?: Record<string, any>) {
  if (!shouldLog('ERROR')) return;
  // eslint-disable-next-line no-console
  console.error(fmt(scope, 'ERROR', msg, extra));
}
