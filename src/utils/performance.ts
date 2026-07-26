type MetricDetails = Record<string, string | number | boolean | null | undefined>;

function monotonicNow() {
  return globalThis.performance?.now?.() ?? Date.now();
}

/**
 * Local-only performance trace. It never persists or transmits measurements.
 * Development builds print one structured line per completed stage.
 */
export class PerformanceTrace {
  private readonly starts = new Map<string, number>();

  constructor(private readonly scope: string) {}

  start(stage: string) {
    this.starts.set(stage, monotonicNow());
  }

  end(stage: string, details?: MetricDetails) {
    const startedAt = this.starts.get(stage);
    if (startedAt === undefined) return;
    this.starts.delete(stage);
    this.record(stage, monotonicNow() - startedAt, details);
  }

  record(stage: string, durationMs: number, details?: MetricDetails) {
    if (!__DEV__) return;
    console.info(
      `[performance] ${this.scope}.${stage}`,
      JSON.stringify({
        durationMs: Math.round(durationMs * 10) / 10,
        ...details,
      }),
    );
  }
}
