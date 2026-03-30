// Pipeline debug logging — writes tagged diagnostic messages to stderr.
// Callers are responsible for checking debugFlags before calling pipelineLog.

/**
 * Write a tagged debug message to process.stderr.
 *
 * Output format: `[tag] msg\n`
 * This function has no internal toggle; the caller must guard calls
 * by checking the appropriate debugFlags field.
 */
export function pipelineLog(tag: string, msg: string): void {
  process.stderr.write(`[${tag}] ${msg}\n`);
}

/**
 * Recursively walk a render tree and return a human-readable dump showing
 * each node's constructor name, size (or "NO_SIZE"), _attached status,
 * _needsLayout flag, and (for RenderText nodes) the first 40 chars of text.
 *
 * Children are accessed via `ro._children || (ro._child ? [ro._child] : [])`.
 */
export function dumpPaintTree(rootRO: any): string {
  const walk = (ro: any, depth: number): string => {
    const indent = '  '.repeat(depth);
    const sz = ro.hasSize ? `${ro.size?.width}x${ro.size?.height}` : 'NO_SIZE';
    const att = ro._attached ? '' : ' DETACHED';
    const nl = ro._needsLayout ? ' needsLayout' : '';
    let extra = '';
    if (ro.constructor.name === 'RenderText' && ro._text) {
      extra = ` text="${String(ro._text.text ?? ro._text).slice(0, 40)}"`;
    }
    let s = `${indent}${ro.constructor.name} ${sz}${att}${nl}${extra}\n`;
    const kids = ro._children || (ro._child ? [ro._child] : []);
    for (const kid of kids) s += walk(kid, depth + 1);
    return s;
  };
  return walk(rootRO, 0);
}

/**
 * Log a tree-mutation operation (insert, remove, move) with a 5-line
 * stack trace for traceability.
 *
 * Callers must guard with `debugFlags.debugPrintBuilds` before calling.
 */
export function logMutation(op: string, child: any, parent: any): void {
  const stack = new Error().stack ?? '';
  const traceLines = stack.split('\n').slice(1, 6).join('\n');
  pipelineLog(
    'MUTATION',
    `${op} child=${child?.constructor?.name} parent=${parent?.constructor?.name}\n${traceLines}`,
  );
}
