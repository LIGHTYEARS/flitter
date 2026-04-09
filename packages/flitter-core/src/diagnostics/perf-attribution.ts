export interface WidgetPerfEntry {
  name: string;
  totalMs: number;
  count: number;
  avgMs: number;
}

type Phase = 'build' | 'layout' | 'paint';

interface PhaseStat {
  totalMs: number;
  count: number;
}

export class PerfAttribution {
  private static _instance: PerfAttribution | null = null;

  private _buildStats: Map<string, PhaseStat> = new Map();
  private _layoutStats: Map<string, PhaseStat> = new Map();
  private _paintStats: Map<string, PhaseStat> = new Map();
  private _frameBuildCount: number = 0;
  private _frameLayoutCount: number = 0;

  static get instance(): PerfAttribution {
    if (!PerfAttribution._instance) {
      PerfAttribution._instance = new PerfAttribution();
    }
    return PerfAttribution._instance;
  }

  static reset(): void {
    PerfAttribution._instance = null;
  }

  recordBuild(widgetName: string, ms: number): void {
    this._frameBuildCount++;
    const stat = this._buildStats.get(widgetName);
    if (stat) {
      stat.totalMs += ms;
      stat.count++;
    } else {
      this._buildStats.set(widgetName, { totalMs: ms, count: 1 });
    }
  }

  recordLayout(renderObjectName: string, ms: number): void {
    this._frameLayoutCount++;
    const stat = this._layoutStats.get(renderObjectName);
    if (stat) {
      stat.totalMs += ms;
      stat.count++;
    } else {
      this._layoutStats.set(renderObjectName, { totalMs: ms, count: 1 });
    }
  }

  recordPaint(renderObjectName: string, ms: number): void {
    const stat = this._paintStats.get(renderObjectName);
    if (stat) {
      stat.totalMs += ms;
      stat.count++;
    } else {
      this._paintStats.set(renderObjectName, { totalMs: ms, count: 1 });
    }
  }

  getTopSlowWidgets(n: number, phase: Phase = 'build'): WidgetPerfEntry[] {
    const statsMap =
      phase === 'build'
        ? this._buildStats
        : phase === 'layout'
          ? this._layoutStats
          : this._paintStats;

    const entries: WidgetPerfEntry[] = [];
    for (const [name, stat] of statsMap) {
      entries.push({
        name,
        totalMs: stat.totalMs,
        count: stat.count,
        avgMs: stat.totalMs / stat.count,
      });
    }

    entries.sort((a, b) => b.totalMs - a.totalMs);
    return entries.slice(0, n);
  }

  get frameBuildCount(): number {
    return this._frameBuildCount;
  }

  get frameLayoutCount(): number {
    return this._frameLayoutCount;
  }

  resetFrame(): void {
    this._frameBuildCount = 0;
    this._frameLayoutCount = 0;
  }

  resetAll(): void {
    this._buildStats.clear();
    this._layoutStats.clear();
    this._paintStats.clear();
    this._frameBuildCount = 0;
    this._frameLayoutCount = 0;
  }
}
