export type Surface = 'portfolio' | 'photography';
export type EventType = 'page_view' | 'section_navigate' | 'project_open' | 'project_close' | 'engagement_flush' | 'scroll_depth' | 'image_open' | 'photo_open' | 'photo_step' | 'category_change' | 'media_start' | 'media_progress' | 'media_complete' | 'media_load_request' | 'outbound_intent';
type Choice = 'accepted' | 'declined';
type Preference = { version: 2; choice: Choice; expires: number };
type BrowserIdentity = { version: 1; id: string; expires: number };
type LegacyConsent = { choice: Choice; expires: number; browserId?: string };
export type AnalyticsEvent = { schema_version: 1; event_id: string; browser_id: string; session_id: string; view_id: string; client_time: string; event_type: EventType; surface: Surface; page_key: string; project_slug: string | null; properties: Record<string, string | number> };

const LEGACY_CONSENT_KEY = 'gxc.analytics.consent.v1';
const PREFERENCE_KEY = 'gxc.analytics.preference.v2';
const BROWSER_KEY = 'gxc.analytics.browser.v1';
const PREFERENCE_MS = 365 * 24 * 60 * 60 * 1000;
const BROWSER_MS = 90 * 24 * 60 * 60 * 1000;
const SESSION_IDLE_MS = 30 * 60 * 1000;
const MAX_EVENT_BYTES = 2048;
const MAX_BATCH_BYTES = 32 * 1024;
const MAX_QUEUE = 200;
const MAX_AGE_MS = 5 * 60 * 1000;
const MAX_TIMEOUT_MS = 2_147_000_000;
const encoder = new TextEncoder();
type Queued = { event: AnalyticsEvent; at: number; retry: number; notBefore: number };
const validEndpoint = (url: string) => { try { const parsed = new URL(url); return parsed.protocol === 'https:' || (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname)); } catch { return false; } };
const validChoice = (value: unknown): value is Choice => value === 'accepted' || value === 'declined';
const validBrowserId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export class AnalyticsClient {
  private surface: Surface | null = null;
  private endpoint = '';
  private preference: Preference | null = null;
  private browser: BrowserIdentity | null = null;
  private storageBlocked = false;
  private sessionId = '';
  private sessionActivity = 0;
  private viewId = '';
  private route = '';
  private pageKey = '';
  private pageKind = '';
  private slug: string | null = null;
  private queue: Queued[] = [];
  private timer = 0;
  private dwellTimer = 0;
  private retryTimer = 0;
  private expiryTimer = 0;
  private sending = false;
  private sendController: AbortController | null = null;
  private trackingGeneration = 0;
  private lastTick = 0;
  private lastActivity = 0;
  private pendingDuration = 0;
  private playing = new Set<string>();
  private depth = new Set<number>();
  private listeners = new Set<() => void>();
  private bound = false;
  private campaignTags = new Set<string>();

  configure(surface: Surface, endpoint: string, enabled: boolean, campaignTags = '') {
    this.surface = surface;
    this.endpoint = enabled && validEndpoint(endpoint) ? endpoint : '';
    this.campaignTags = new Set(campaignTags.split(',').map(tag => tag.trim()).filter(tag => /^[a-z][a-z0-9_-]{1,31}$/.test(tag)));
    if (!this.endpoint || typeof window === 'undefined') return;
    this.readConsent();
    if (!this.bound) {
      this.bound = true;
      window.addEventListener('pointerdown', this.activity, { passive: true });
      window.addEventListener('keydown', this.activity);
      window.addEventListener('scroll', this.onScroll, { passive: true, capture: true });
      window.addEventListener('visibilitychange', this.onVisibility);
      window.addEventListener('pagehide', this.onPageHide);
      window.addEventListener('focus', this.onFocus);
      window.addEventListener('blur', this.onBlur);
      window.addEventListener('storage', this.onStorage);
      document.addEventListener('click', this.onClick, true);
      this.lastTick = performance.now();
      this.dwellTimer = window.setInterval(() => this.tick(), 1000);
      this.timer = window.setInterval(() => {
        const restart = this.readConsent();
        if (restart) this.startCurrentView();
        this.flushDuration();
        void this.flush();
      }, 30_000);
    }
    this.notify();
  }
  get enabled() { return !!this.endpoint; }
  get choice(): Choice | null {
    const restart = this.readConsent();
    if (restart) this.startCurrentView();
    return this.preference?.choice ?? null;
  }
  get tracking() {
    const restart = this.readConsent();
    if (restart) this.startCurrentView();
    return this.active();
  }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private notify() { this.listeners.forEach(listener => listener()); }
  private readJson(key: string) {
    try { return { ok: true as const, value: JSON.parse(localStorage.getItem(key) ?? 'null') as unknown }; }
    catch { return { ok: false as const, value: null }; }
  }
  private saveJson(key: string, value: unknown) {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return localStorage.getItem(key) === serialized;
    } catch { return false; }
  }
  private removeStored(key: string) { try { localStorage.removeItem(key); return true; } catch { return false; } }
  private validPreference(value: unknown, now: number): value is Preference {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Partial<Preference>;
    return candidate.version === 2 && validChoice(candidate.choice) && Number.isFinite(candidate.expires) && candidate.expires! > now;
  }
  private validBrowser(value: unknown, now: number): value is BrowserIdentity {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Partial<BrowserIdentity>;
    return candidate.version === 1 && validBrowserId(candidate.id) && Number.isFinite(candidate.expires) && candidate.expires! > now;
  }
  private validLegacy(value: unknown, now: number): value is LegacyConsent {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as Partial<LegacyConsent>;
    return validChoice(candidate.choice)
      && Number.isFinite(candidate.expires)
      && candidate.expires! > now
      && (candidate.browserId === undefined || validBrowserId(candidate.browserId));
  }
  private migrateLegacy(now: number) {
    const stored = this.readJson(LEGACY_CONSENT_KEY);
    if (!stored.ok) return { ok: false as const, preference: null, browser: null };
    if (!this.validLegacy(stored.value, now)) {
      if (stored.value) this.removeStored(LEGACY_CONSENT_KEY);
      return { ok: true as const, preference: null, browser: null };
    }
    const legacy = stored.value;
    const preference: Preference = { version: 2, choice: legacy.choice, expires: legacy.expires };
    if (legacy.choice === 'declined') {
      if (!this.saveJson(PREFERENCE_KEY, preference)) return { ok: false as const, preference: null, browser: null };
      this.removeStored(BROWSER_KEY);
      this.removeStored(LEGACY_CONSENT_KEY);
      return { ok: true as const, preference, browser: null };
    }
    const browser: BrowserIdentity = {
      version: 1,
      id: validBrowserId(legacy.browserId) ? legacy.browserId : crypto.randomUUID(),
      expires: validBrowserId(legacy.browserId) ? legacy.expires : Math.min(legacy.expires, now + BROWSER_MS),
    };
    if (!this.saveJson(BROWSER_KEY, browser)) return { ok: false as const, preference: null, browser: null };
    if (!this.saveJson(PREFERENCE_KEY, preference)) {
      this.removeStored(BROWSER_KEY);
      return { ok: false as const, preference: null, browser: null };
    }
    this.removeStored(LEGACY_CONSENT_KEY);
    return { ok: true as const, preference, browser };
  }
  private applyStoredState(preference: Preference | null, browser: BrowserIdentity | null) {
    const previousId = this.preference?.choice === 'accepted' ? this.browser?.id ?? 'accepted-without-identity' : null;
    this.preference = preference;
    this.browser = browser;
    const nextId = this.preference?.choice === 'accepted' ? this.browser?.id ?? 'accepted-without-identity' : null;
    if (previousId === nextId) { this.scheduleExpiry(); return false; }
    this.resetTracking();
    this.scheduleExpiry();
    return !!nextId && !!this.route;
  }
  private readConsent() {
    if (!this.endpoint) return false;
    if (this.storageBlocked) return this.applyStoredState(null, null);
    const now = Date.now();
    const storedPreference = this.readJson(PREFERENCE_KEY);
    if (!storedPreference.ok) return this.applyStoredState(null, null);
    let preference: Preference | null = this.validPreference(storedPreference.value, now) ? storedPreference.value : null;
    let migratedBrowser: BrowserIdentity | null = null;
    if (!preference) {
      if (storedPreference.value) this.removeStored(PREFERENCE_KEY);
      const migrated = this.migrateLegacy(now);
      if (!migrated.ok) return this.applyStoredState(null, null);
      preference = migrated.preference;
      migratedBrowser = migrated.browser;
    } else {
      this.removeStored(LEGACY_CONSENT_KEY);
    }
    if (!preference) {
      this.removeStored(BROWSER_KEY);
      return this.applyStoredState(null, null);
    }
    if (preference.choice === 'declined') {
      this.removeStored(BROWSER_KEY);
      return this.applyStoredState(preference, null);
    }
    let browser = migratedBrowser;
    if (!browser) {
      const storedBrowser = this.readJson(BROWSER_KEY);
      if (!storedBrowser.ok) return this.applyStoredState(preference, null);
      browser = this.validBrowser(storedBrowser.value, now) ? storedBrowser.value : null;
      if (!browser) {
        if (storedBrowser.value) this.removeStored(BROWSER_KEY);
        const replacement: BrowserIdentity = { version: 1, id: crypto.randomUUID(), expires: now + BROWSER_MS };
        if (this.saveJson(BROWSER_KEY, replacement)) browser = replacement;
      }
    }
    return this.applyStoredState(preference, browser);
  }
  private scheduleExpiry() {
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    this.expiryTimer = 0;
    const expires = this.preference?.choice === 'accepted' && this.browser ? Math.min(this.preference.expires, this.browser.expires) : this.preference?.expires;
    if (!expires || typeof window === 'undefined') return;
    const delay = Math.max(0, Math.min(MAX_TIMEOUT_MS, expires - Date.now() + 1));
    this.expiryTimer = window.setTimeout(() => {
      this.expiryTimer = 0;
      const restart = this.readConsent();
      if (restart) this.startCurrentView();
      this.notify();
    }, delay);
  }
  private active() { return this.enabled && this.preference?.choice === 'accepted' && this.preference.expires > Date.now() && !!this.browser && this.browser.expires > Date.now(); }
  accept() {
    if (!this.endpoint) { this.notify(); return false; }
    this.storageBlocked = false;
    const restart = this.readConsent();
    if (restart) this.startCurrentView();
    if (this.active()) { this.notify(); return true; }
    const now = Date.now();
    const preference: Preference = this.preference?.choice === 'accepted'
      ? this.preference
      : { version: 2, choice: 'accepted', expires: now + PREFERENCE_MS };
    const browser: BrowserIdentity = { version: 1, id: crypto.randomUUID(), expires: now + BROWSER_MS };
    if (!this.saveJson(BROWSER_KEY, browser) || !this.saveJson(PREFERENCE_KEY, preference)) {
      this.removeStored(BROWSER_KEY);
      this.storageBlocked = true;
      this.applyStoredState(null, null);
      this.notify();
      return false;
    }
    this.removeStored(LEGACY_CONSENT_KEY);
    this.storageBlocked = false;
    this.applyStoredState(preference, browser);
    this.lastActivity = now;
    this.lastTick = performance.now();
    if (this.route) this.startCurrentView();
    this.notify();
    return true;
  }
  decline() {
    if (!this.endpoint) { this.notify(); return false; }
    this.storageBlocked = false;
    this.applyStoredState(null, null);
    this.removeStored(BROWSER_KEY);
    this.removeStored(LEGACY_CONSENT_KEY);
    this.removeStored(PREFERENCE_KEY);
    const preference: Preference = { version: 2, choice: 'declined', expires: Date.now() + PREFERENCE_MS };
    if (!this.saveJson(PREFERENCE_KEY, preference)) {
      this.storageBlocked = true;
      this.applyStoredState(null, null);
      this.notify();
      return false;
    }
    this.storageBlocked = false;
    this.applyStoredState(preference, null);
    this.notify();
    return true;
  }
  revoke() {
    this.storageBlocked = false;
    this.applyStoredState(null, null);
    const cleared = [PREFERENCE_KEY, BROWSER_KEY, LEGACY_CONSENT_KEY].map(key => this.removeStored(key)).every(Boolean);
    this.storageBlocked = !cleared;
    this.notify();
  }
  private resetTracking() {
    this.trackingGeneration += 1;
    this.sendController?.abort();
    this.sendController = null;
    this.sending = false;
    this.queue = [];
    this.playing.clear();
    this.sessionId = '';
    this.sessionActivity = 0;
    this.viewId = '';
    this.pendingDuration = 0;
    this.depth.clear();
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = 0;
  }
  private ensureSession() {
    const now = Date.now();
    if (!this.sessionId || now - this.sessionActivity >= SESSION_IDLE_MS) {
      this.sessionId = crypto.randomUUID();
      this.sessionActivity = now;
      this.viewId = crypto.randomUUID();
      return true;
    }
    return false;
  }
  private enqueue(eventType: EventType, properties: Record<string, string | number> = {}) {
    if (!this.active() || !this.surface || !this.viewId || !this.browser) return;
    const event: AnalyticsEvent = { schema_version: 1, event_id: crypto.randomUUID(), browser_id: this.browser.id, session_id: this.sessionId, view_id: this.viewId, client_time: new Date().toISOString(), event_type: eventType, surface: this.surface, page_key: this.pageKey, project_slug: this.slug, properties };
    if (encoder.encode(JSON.stringify(event)).length > MAX_EVENT_BYTES) return;
    this.queue.push({ event, at: Date.now(), retry: 0, notBefore: 0 });
    this.queue = this.queue.filter(item => Date.now() - item.at <= MAX_AGE_MS).slice(-MAX_QUEUE);
    if (this.queue.length >= 20) void this.flush();
  }
  private startCurrentView(entry?: string) {
    if (!this.active() || !this.route) return;
    this.ensureSession();
    this.viewId = crypto.randomUUID();
    this.depth.clear();
    this.pendingDuration = 0;
    const properties: Record<string, string> = { page_kind: this.pageKind || 'page' };
    try {
      const host = new URL(document.referrer).hostname.toLowerCase();
      if (host && host !== location.hostname && host.length <= 120) properties.referrer_host = host;
    } catch { /* No external referrer. */ }
    const campaign = new URLSearchParams(location.search).get('campaign');
    if (campaign && this.campaignTags.has(campaign)) properties.campaign = campaign;
    this.enqueue('page_view', properties);
    if (this.slug) this.enqueue('project_open', { entry: entry ?? 'history' });
  }
  commitView(route: string, pageKey: string, slug: string | null, pageKind: string, entry?: string) {
    this.readConsent();
    if (route === this.route && this.viewId) return;
    if (this.viewId) this.flushDuration();
    this.route = route;
    this.pageKey = pageKey;
    this.pageKind = pageKind;
    this.slug = slug;
    this.startCurrentView(entry);
  }
  emit(eventType: EventType, properties: Record<string, string | number> = {}) {
    const restart = this.readConsent();
    if (restart) this.startCurrentView();
    if (!this.active() || !this.surface || !this.viewId) return;
    if (eventType !== 'engagement_flush') {
      const newSession = this.ensureSession();
      this.sessionActivity = Date.now();
      this.lastActivity = Date.now();
      if (newSession && eventType !== 'page_view') this.enqueue('page_view', { page_kind: this.pageKind || 'page' });
    }
    this.enqueue(eventType, properties);
  }
  private activity = () => { if (this.active()) { this.sessionActivity = Date.now(); this.lastActivity = Date.now(); } };
  private onClick = (event: MouseEvent) => {
    const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!anchor || !this.active()) return;
    const href = anchor.getAttribute('href') ?? '';
    let destination = '';
    if (href.startsWith('mailto:')) destination = href.toLowerCase().includes('resume request') || href.toLowerCase().includes('resume%20request') ? 'resume' : 'email';
    else { try { const url = new URL(href, location.href); if (url.origin !== location.origin) destination = url.hostname.endsWith('linkedin.com') ? 'linkedin' : 'external'; } catch { /* Ignore invalid URL. */ } }
    if (destination) this.emit('outbound_intent', { destination_kind: destination });
  };
  private onScroll = () => {
    if (!this.active() || !this.viewId) return;
    this.activity();
    const scroller = this.surface === 'photography' ? document.querySelector<HTMLElement>('.photo-panel:not([inert])') : document.querySelector<HTMLElement>('.gxc-detail-dialog[open] .gxc-detail-scroll');
    const top = scroller ? scroller.scrollTop : scrollY;
    const max = scroller ? scroller.scrollHeight - scroller.clientHeight : document.documentElement.scrollHeight - innerHeight;
    const pct = max <= 0 ? 100 : Math.min(100, (top / max) * 100);
    for (const milestone of [25, 50, 75, 100]) if (pct >= milestone && !this.depth.has(milestone)) { this.depth.add(milestone); this.emit('scroll_depth', { milestone }); }
  };
  setPlaying(id: string, playing: boolean) {
    const restart = this.readConsent();
    if (restart) this.startCurrentView();
    if (!this.active()) return;
    this.tick();
    if (playing) this.playing.add(id); else this.playing.delete(id);
  }
  private tick() {
    const now = performance.now(); const elapsed = Math.max(0, Math.min(30_000, now - this.lastTick)); this.lastTick = now;
    if (!this.active() || !this.viewId || document.visibilityState !== 'visible' || !document.hasFocus() || (Date.now() - this.lastActivity >= 60_000 && this.playing.size === 0)) return;
    if (this.playing.size > 0) { this.sessionActivity = Date.now(); this.lastActivity = Date.now(); }
    this.pendingDuration += elapsed;
    while (this.pendingDuration >= 60_000) { this.enqueue('engagement_flush', { duration_ms: 60_000 }); this.pendingDuration -= 60_000; }
  }
  private flushDuration() { this.tick(); if (this.pendingDuration >= 1000) { this.enqueue('engagement_flush', { duration_ms: Math.min(60_000, Math.round(this.pendingDuration)) }); this.pendingDuration = 0; } }
  private onVisibility = () => { if (document.visibilityState === 'hidden') { this.flushDuration(); void this.flush(true); } else this.lastTick = performance.now(); };
  private onPageHide = () => { this.flushDuration(); void this.flush(true); };
  private onFocus = () => { this.lastTick = performance.now(); };
  private onBlur = () => { this.flushDuration(); void this.flush(true); };
  private onStorage = (event: StorageEvent) => {
    if (event.key !== null && ![PREFERENCE_KEY, BROWSER_KEY, LEGACY_CONSENT_KEY].includes(event.key)) return;
    this.storageBlocked = false;
    const restart = this.readConsent();
    if (restart) this.startCurrentView();
    this.notify();
  };
  async flush(urgent = false) {
    const restart = this.readConsent();
    if (restart) this.startCurrentView();
    if (!this.active() || this.sending || !this.queue.length || !this.browser) return;
    const browserId = this.browser.id;
    this.queue = this.queue.filter(item => Date.now() - item.at <= MAX_AGE_MS && item.event.browser_id === browserId);
    if (!this.queue.length || this.queue[0].notBefore > Date.now()) return;
    const batch: Queued[] = []; let bytes = encoder.encode('{"schema_version":1,"events":[]}').length;
    for (const item of this.queue) { const size = encoder.encode(JSON.stringify(item.event)).length + 1; if (batch.length === 20 || bytes + size > MAX_BATCH_BYTES || item.notBefore > Date.now()) break; batch.push(item); bytes += size; }
    if (!batch.length) return;
    this.queue.splice(0, batch.length);
    const body = JSON.stringify({ schema_version: 1, events: batch.map(item => item.event) });
    // JSON beacons carry credentials and cannot use this collector's anonymous CORS policy.
    // The bounded keepalive fetch also lets a later refusal abort pending delivery.
    this.sending = true;
    const generation = this.trackingGeneration;
    const controller = new AbortController();
    this.sendController = controller;
    let retryable = true;
    try {
      const response = await fetch(this.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: urgent, credentials: 'omit', mode: 'cors', signal: controller.signal });
      if (!response.ok) { retryable = response.status === 429 || response.status >= 500; throw new Error('collector unavailable'); }
    } catch {
      if (generation === this.trackingGeneration && this.active() && this.browser?.id === browserId && retryable) {
        const retry = batch.filter(item => item.retry < 2 && Date.now() - item.at <= MAX_AGE_MS).map(item => ({ ...item, retry: item.retry + 1, notBefore: Date.now() + 15_000 * (item.retry + 1) }));
        this.queue = [...retry, ...this.queue].slice(0, MAX_QUEUE);
        if (retry.length && !this.retryTimer) this.retryTimer = window.setTimeout(() => { this.retryTimer = 0; void this.flush(); }, 15_000 * retry[0].retry);
      }
    } finally {
      if (generation === this.trackingGeneration) {
        if (this.sendController === controller) this.sendController = null;
        this.sending = false;
      }
    }
  }
}

export const analytics = new AnalyticsClient();
