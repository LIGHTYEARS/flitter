// Pipeline debug logging — writes tagged diagnostic messages to stderr.
// Callers are responsible for checking debugFlags before calling pipelineLog.

const _defaultSink = (tag: string, msg: string): void => {
  process.stderr.write(`[${tag}] ${msg}\n`);
};

let _sink: (tag: string, msg: string) => void = _defaultSink;

/**
 * Replace the pipeline log sink with a custom function.
 *
 * All subsequent calls to `pipelineLog` will be forwarded to `sink`
 * instead of the default stderr writer.
 */
export function setPipelineLogSink(sink: (tag: string, msg: string) => void): void {
  _sink = sink;
}

/**
 * Restore the pipeline log sink to the default stderr writer.
 */
export function resetPipelineLogSink(): void {
  _sink = _defaultSink;
}

/**
 * Write a tagged debug message to process.stderr.
 *
 * Output format: `[tag] msg\n`
 * This function has no internal toggle; the caller must guard calls
 * by checking the appropriate debugFlags field.
 */
export function pipelineLog(tag: string, msg: string): void {
  _sink(tag, msg);
}

/**
 * Recursively walk a render tree and return a human-readable dump showing
 * each node's constructor name, size (or "NO_SIZE"), _attached status,
 * _needsLayout flag, and (for RenderText nodes) the first 40 chars of text.
 *
 * Children are accessed via `ro._children || (ro._child ? [ro._child] : [])`.
 */
export function dumpPaintTree(rootRO: unknown): string {
  const walk = (ro: unknown, depth: number): string => {
    const obj = ro as Record<string, unknown>;
    const indent = '  '.repeat(depth);
    const size = obj.size as Record<string, unknown> | undefined;
    const sz = obj.hasSize ? `${size?.width}x${size?.height}` : 'NO_SIZE';
    const att = obj._attached ? '' : ' DETACHED';
    const nl = obj._needsLayout ? ' needsLayout' : '';
    let extra = '';
    if ((ro as object).constructor.name === 'RenderText' && obj._text) {
      const textVal = obj._text as Record<string, unknown>;
      extra = ` text="${String(textVal.text ?? obj._text).slice(0, 40)}"`;
    }
    let s = `${indent}${(ro as object).constructor.name} ${sz}${att}${nl}${extra}\n`;
    const kids = (obj._children || (obj._child ? [obj._child] : [])) as unknown[];
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
export function logMutation(op: string, child: unknown, parent: unknown): void {
  const stack = new Error().stack ?? '';
  const traceLines = stack.split('\n').slice(1, 6).join('\n');
  pipelineLog(
    'MUTATION',
    `${op} child=${(child as Record<string, unknown>)?.constructor?.name} parent=${(parent as Record<string, unknown>)?.constructor?.name}\n${traceLines}`,
  );
}
