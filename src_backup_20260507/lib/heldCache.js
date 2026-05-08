// src/lib/heldCache.js
//
// Centralized localStorage cache for Held's most expensive data fetches.
//
// WHY THIS EXISTS:
//   Every tab switch in Held remounts the active component, which fires
//   all its Supabase hooks cold. useFamilyState alone fires 5 parallel
//   queries. useCheckinHistory, useRecentCheckin, useRecentRegulationCheckins
//   each fire independently. The result is a blank screen for 1-3 seconds
//   every time a parent switches tabs — completely unacceptable in a support app.
//
// HOW IT WORKS:
//   Each hook reads from this cache first → renders immediately with cached data →
//   then fetches from Supabase in the background → updates state + writes back
//   to cache. Parents see real data instantly. Fresh data arrives silently.
//
// TTLs are generous because:
//   - Sleep logs / regulation checkins are written by the same app, so we
//     invalidate the cache immediately on any write.
//   - We always background-fetch on mount anyway, so stale data is only
//     shown for ~500ms before the network response arrives.
//
// CACHE KEYS:
//   held:familyState:{familyId}:{childId}:{userId}   — useFamilyState
//   held:regCheckins:{userId}                         — useRecentRegulationCheckins
//   held:recentCheckin:{userId}                       — useRecentCheckin
//   held:checkinHistory:{userId}:{familyId}           — useCheckinHistory
//   held:sleepLogs:{familyId}:{childId}               — useRecentSleep / SleepLog
//   held:nextSleep:{familyId}:{childId}               — useNextSleep

const TTL = {
  familyState:      5 * 60 * 1000,   // 5 min  — expensive 5-query bundle
  regCheckins:      3 * 60 * 1000,   // 3 min  — drives scenario engine
  recentCheckin:    2 * 60 * 1000,   // 2 min  — NS pulse tile
  checkinHistory:   5 * 60 * 1000,   // 5 min  — pattern analysis
  sleepLogs:        2 * 60 * 1000,   // 2 min  — sleep tab
  nextSleep:        1 * 60 * 1000,   // 1 min  — next sleep tile (time-sensitive)
};

// ─── CORE READ/WRITE ──────────────────────────────────────────────────────────

export function readCache(key) {
  try {
    const raw = localStorage.getItem(`held:${key}`);
    if (!raw) return null;
    const { data, ts, ttl } = JSON.parse(raw);
    if (Date.now() - ts > ttl) {
      localStorage.removeItem(`held:${key}`);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function writeCache(key, data, ttlMs) {
  try {
    localStorage.setItem(`held:${key}`, JSON.stringify({
      data,
      ts: Date.now(),
      ttl: ttlMs,
    }));
  } catch {
    // localStorage full or unavailable — fail silently
  }
}

export function invalidateCache(key) {
  try { localStorage.removeItem(`held:${key}`); } catch {}
}

// Invalidate all cache entries matching a prefix (e.g. all keys for a user)
export function invalidateCachePrefix(prefix) {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(`held:${prefix}`))
      .forEach(k => localStorage.removeItem(k));
  } catch {}
}

// ─── NAMED CACHE ACCESSORS ────────────────────────────────────────────────────
// These are the functions hooks actually call — no raw string keys in hook files.

export const FamilyStateCache = {
  key: (familyId, childId, userId) => `familyState:${familyId}:${childId}:${userId}`,
  read: (familyId, childId, userId) => readCache(FamilyStateCache.key(familyId, childId, userId)),
  write: (familyId, childId, userId, data) => writeCache(FamilyStateCache.key(familyId, childId, userId), data, TTL.familyState),
  invalidate: (familyId, childId, userId) => invalidateCache(FamilyStateCache.key(familyId, childId, userId)),
};

export const RegCheckinsCache = {
  key: (userId) => `regCheckins:${userId}`,
  read: (userId) => readCache(RegCheckinsCache.key(userId)),
  write: (userId, data) => writeCache(RegCheckinsCache.key(userId), data, TTL.regCheckins),
  invalidate: (userId) => invalidateCache(RegCheckinsCache.key(userId)),
};

export const RecentCheckinCache = {
  key: (userId) => `recentCheckin:${userId}`,
  read: (userId) => readCache(RecentCheckinCache.key(userId)),
  write: (userId, data) => writeCache(RecentCheckinCache.key(userId), data, TTL.recentCheckin),
  invalidate: (userId) => invalidateCache(RecentCheckinCache.key(userId)),
};

export const CheckinHistoryCache = {
  key: (userId, familyId) => `checkinHistory:${userId}:${familyId}`,
  read: (userId, familyId) => readCache(CheckinHistoryCache.key(userId, familyId)),
  write: (userId, familyId, data) => writeCache(CheckinHistoryCache.key(userId, familyId), data, TTL.checkinHistory),
  invalidate: (userId, familyId) => invalidateCache(CheckinHistoryCache.key(userId, familyId)),
};

export const SleepLogsCache = {
  key: (familyId, childId) => `sleepLogs:${familyId}:${childId}`,
  read: (familyId, childId) => readCache(SleepLogsCache.key(familyId, childId)),
  write: (familyId, childId, data) => writeCache(SleepLogsCache.key(familyId, childId), data, TTL.sleepLogs),
  invalidate: (familyId, childId) => invalidateCache(SleepLogsCache.key(familyId, childId)),
  invalidateFamily: (familyId) => invalidateCachePrefix(`sleepLogs:${familyId}`),
};

export const NextSleepCache = {
  key: (familyId, childId) => `nextSleep:${familyId}:${childId}`,
  read: (familyId, childId) => readCache(NextSleepCache.key(familyId, childId)),
  write: (familyId, childId, data) => writeCache(NextSleepCache.key(familyId, childId), data, TTL.nextSleep),
  invalidate: (familyId, childId) => invalidateCache(NextSleepCache.key(familyId, childId)),
};
