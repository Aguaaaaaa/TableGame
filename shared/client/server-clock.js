"use strict";

const defaultWallNow = () => Date.now();
const defaultMonotonicNow = () => globalThis.performance?.now?.() ?? Date.now();

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function createServerClock({
  wallNow = defaultWallNow,
  monotonicNow = defaultMonotonicNow
} = {}) {
  let synced = false;
  let anchorServerMs = 0;
  let anchorMonotonicMs = 0;
  let lastRttMs = null;
  let lastSyncMonotonicMs = 0;

  function now() {
    if (!synced) return wallNow();
    return anchorServerMs + (monotonicNow() - anchorMonotonicMs);
  }

  function applySamples(samples, { smooth = synced } = {}) {
    const valid = (samples || []).filter((sample) =>
      Number.isFinite(sample?.serverNow)
      && Number.isFinite(sample?.wallStart)
      && Number.isFinite(sample?.wallEnd)
      && sample.wallEnd >= sample.wallStart
    ).map((sample) => ({
      ...sample,
      rttMs: Number.isFinite(sample.rttMs) ? Math.max(0, sample.rttMs) : Math.max(0, sample.wallEnd - sample.wallStart),
      offsetMs: sample.serverNow - (sample.wallStart + sample.wallEnd) / 2
    }));
    if (!valid.length) return false;

    // 网络排队只会拉长往返时间。取延迟最低的三个样本，再取其中位数抵抗单次抖动。
    const best = valid.sort((a, b) => a.rttMs - b.rttMs).slice(0, Math.min(3, valid.length));
    const offsetMs = median(best.map((sample) => sample.offsetMs));
    const targetServerNow = wallNow() + offsetMs;
    const currentServerNow = now();
    const correction = targetServerNow - currentServerNow;
    const appliedCorrection = smooth && Math.abs(correction) < 2000 ? correction * 0.25 : correction;

    anchorServerMs = currentServerNow + appliedCorrection;
    anchorMonotonicMs = monotonicNow();
    synced = true;
    lastRttMs = best[0].rttMs;
    lastSyncMonotonicMs = anchorMonotonicMs;
    return true;
  }

  function snapshot() {
    return Object.freeze({
      synced,
      serverNow: now(),
      clockOffsetMs: synced ? now() - wallNow() : 0,
      lastRttMs,
      ageMs: synced ? Math.max(0, monotonicNow() - lastSyncMonotonicMs) : null
    });
  }

  function reset() {
    synced = false;
    anchorServerMs = 0;
    anchorMonotonicMs = 0;
    lastRttMs = null;
    lastSyncMonotonicMs = 0;
  }

  return Object.freeze({ now, applySamples, snapshot, reset });
}

export const sharedServerClock = createServerClock();
export const serverNow = () => sharedServerClock.now();

