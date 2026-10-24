export const ACTIVITY_IDLE_MS = 120_000;

// Durations use a monotonic clock; changing the system date cannot add study time.
// A sample closes the previous interval before applying focus, route or input changes.
export class PageActivityClock {
  constructor(clock = () => Math.floor(performance.now())) {
    this.clock = clock;
    this.key = null;
    this.visible = false;
    this.focused = false;
    this.lastSample = clock();
    this.lastInteraction = this.lastSample;
  }

  sample({
    key = this.key,
    visible = this.visible,
    focused = this.focused,
    interacted = false,
  } = {}) {
    const at = Math.max(this.lastSample, this.clock());
    const eligible = this.visible && this.focused;
    const pageMs = this.key ? at - this.lastSample : 0;
    const result = {
      key: this.key,
      pageMs,
      visibleMs: eligible ? pageMs : 0,
      activeMs:
        this.key && eligible
          ? Math.max(
              0,
              Math.min(at, this.lastInteraction + ACTIVITY_IDLE_MS) - this.lastSample,
            )
          : 0,
      enteredKey: key && key !== this.key ? key : null,
    };
    if (
      key !== this.key ||
      (!eligible && visible && focused) ||
      (interacted && visible && focused)
    )
      this.lastInteraction = at;
    this.key = key;
    this.visible = visible;
    this.focused = focused;
    this.lastSample = at;
    return result;
  }
}

export function activitySummary(record) {
  return {
    tracked: !!record,
    firstVisitedAt: record?.firstVisitedAt ?? null,
    lastVisitedAt: record?.lastVisitedAt ?? null,
    visits: record?.visits ?? 0,
    pageMs: record?.pageMs ?? 0,
    visibleMs: record?.visibleMs ?? 0,
    activeMs: record?.activeMs ?? 0,
    idleMs: record ? record.visibleMs - record.activeMs : 0,
    awayMs: record ? record.pageMs - record.visibleMs : 0,
    idleAfterMs: ACTIVITY_IDLE_MS,
  };
}

export function formatDuration(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours ? hours + " год " : ""}${minutes} хв ${seconds % 60} с`;
}
