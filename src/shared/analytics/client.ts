export type Surface = 'portfolio' | 'photography';
export type EventType = 'page_view' | 'section_navigate' | 'project_open' | 'project_close' | 'engagement_flush' | 'scroll_depth' | 'image_open' | 'photo_open' | 'photo_step' | 'category_change' | 'media_start' | 'media_progress' | 'media_complete' | 'media_load_request' | 'outbound_intent';
type Choice = 'accepted' | 'declined';
type Consent = { choice: Choice; expires: number; browserId?: string };
export type AnalyticsEvent = { schema_version: 1; event_id: string; browser_id: string; session_id: string; view_id: string; client_time: string; event_type: EventType; surface: Surface; page_key: string; project_slug: string | null; properties: Record<string, string | number> };

const CONSENT_KEY = 'gxc.analytics.consent.v1';
const CONSENT_MS = 90 * 24 * 60 * 60 * 1000;
const SESSION_IDLE_MS = 30 * 60 * 1000;
const MAX_EVENT_BYTES = 2048;
const MAX_BATCH_BYTES = 32 * 1024;
const MAX_QUEUE = 200;
const MAX_AGE_MS = 5 * 60 * 1000;
const encoder = new TextEncoder();
type Queued = { event: AnalyticsEvent; at: number; retry: number; notBefore: number };
const validEndpoint = (url: string) => { try { const parsed = new URL(url); return parsed.protocol === 'https:' || (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname)); } catch { return false; } };

export class AnalyticsClient {
  private surface: Surface | null = null;
  private endpoint = '';
  private consent: Consent | null = null;
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
  private sending = false;
  private sendController: AbortController | null = null;
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
      this.timer = window.setInterval(() => { if (this.consent && this.consent.expires <= Date.now()) { this.readConsent(); this.notify(); } this.flushDuration(); void this.flush(); }, 30_000);
    }
    this.notify();
  }
  get enabled() { return !!this.endpoint; }
  get choice(): Choice | null { this.readConsent(); return this.consent?.choice ?? null; }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private notify() { this.listeners.forEach(listener => listener()); }
  private readConsent() {
    if (!this.endpoint || typeof localStorage === 'undefined') return;
    try {
      const parsed = JSON.parse(localStorage.getItem(CONSENT_KEY) ?? 'null') as Consent | null;
      if (parsed && (parsed.choice === 'accepted' || parsed.choice === 'declined') && Number.isFinite(parsed.expires) && parsed.expires > Date.now() && (parsed.choice === 'declined' || (typeof parsed.browserId === 'string' && /^[0-9a-f-]{36}$/.test(parsed.browserId)))) {
        if (this.consent?.choice === 'accepted' && (parsed.choice !== 'accepted' || parsed.browserId !== this.consent.browserId)) this.resetTracking();
        this.consent = parsed; return;
      }
      if (parsed) localStorage.removeItem(CONSENT_KEY);
    } catch { /* Storage can be unavailable; consent remains unsaved. */ }
    this.consent = null;
    this.resetTracking();
  }
  private saveConsent(value: Consent) { try { localStorage.setItem(CONSENT_KEY, JSON.stringify(value)); } catch { /* No durable consent means no tracking. */ return false; } return true; }
  accept() {
    if (!this.endpoint) return;
    const value: Consent = { choice: 'accepted', expires: Date.now() + CONSENT_MS, browserId: crypto.randomUUID() };
    if (!this.saveConsent(value)) return;
    this.consent = value;
    this.sessionId = crypto.randomUUID(); this.sessionActivity = Date.now(); this.lastActivity = Date.now();
    this.lastTick = performance.now();
    this.viewId = ''; this.notify();
    if (this.route) this.commitView(this.route, this.pageKey, this.slug, this.pageKind || 'page');
  }
  decline() { if (!this.endpoint) return; this.revoke(); const value: Consent = { choice: 'declined', expires: Date.now() + CONSENT_MS }; if (this.saveConsent(value)) this.consent = value; this.notify(); }
  revoke() { this.tick(); this.consent = null; this.resetTracking(); try { localStorage.removeItem(CONSENT_KEY); } catch { /* ignored */ } this.notify(); }
  private resetTracking() { this.sendController?.abort(); this.sendController = null; this.queue = []; this.playing.clear(); this.sessionId = ''; this.sessionActivity = 0; this.viewId = ''; this.pendingDuration = 0; this.depth.clear(); if (this.retryTimer) clearTimeout(this.retryTimer); this.retryTimer = 0; }
  private active() { return this.enabled && this.consent?.choice === 'accepted' && !!this.consent.browserId && this.consent.expires > Date.now(); }
  private ensureSession() { const now = Date.now(); if (!this.sessionId || now - this.sessionActivity >= SESSION_IDLE_MS) { this.sessionId = crypto.randomUUID(); this.viewId = crypto.randomUUID(); return true; } return false; }
  commitView(route: string, pageKey: string, slug: string | null, pageKind: string, entry?: string) {
    this.readConsent();
    if (route === this.route && this.viewId) return;
    if (this.viewId) this.flushDuration();
    this.route = route; this.pageKey = pageKey; this.pageKind = pageKind; this.slug = slug;
    if (!this.active()) return;
    this.ensureSession(); this.viewId = crypto.randomUUID(); this.depth.clear(); this.pendingDuration = 0;
    const properties: Record<string, string> = { page_kind: pageKind };
    try {
      const host = new URL(document.referrer).hostname.toLowerCase();
      if (host && host !== location.hostname && host.length <= 120) properties.referrer_host = host;
    } catch { /* No external referrer. */ }
    const campaign = new URLSearchParams(location.search).get('campaign');
    if (campaign && this.campaignTags.has(campaign)) properties.campaign = campaign;
    this.emit('page_view', properties);
    if (slug) this.emit('project_open', { entry: entry ?? 'history' });
  }
  emit(eventType: EventType, properties: Record<string, string | number> = {}) {
    this.readConsent();
    if (!this.active() || !this.surface || !this.viewId) return;
    if (eventType !== 'engagement_flush') {
      const newSession = this.ensureSession();
      this.sessionActivity = Date.now(); this.lastActivity = Date.now();
      if (newSession && eventType !== 'page_view') this.emit('page_view', { page_kind: this.pageKind || 'page' });
    }
    const event: AnalyticsEvent = { schema_version: 1, event_id: crypto.randomUUID(), browser_id: this.consent!.browserId!, session_id: this.sessionId, view_id: this.viewId, client_time: new Date().toISOString(), event_type: eventType, surface: this.surface, page_key: this.pageKey, project_slug: this.slug, properties };
    if (encoder.encode(JSON.stringify(event)).length > MAX_EVENT_BYTES) return;
    this.queue.push({ event, at: Date.now(), retry: 0, notBefore: 0 });
    this.queue = this.queue.filter(item => Date.now() - item.at <= MAX_AGE_MS).slice(-MAX_QUEUE);
    if (this.queue.length >= 20) void this.flush();
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
  setPlaying(id: string, playing: boolean) { if (!this.active()) return; this.tick(); if (playing) this.playing.add(id); else this.playing.delete(id); }
  private tick() {
    const now = performance.now(); const elapsed = Math.max(0, Math.min(30_000, now - this.lastTick)); this.lastTick = now;
    if (!this.active() || !this.viewId || document.visibilityState !== 'visible' || !document.hasFocus() || (Date.now() - this.lastActivity >= 60_000 && this.playing.size === 0)) return;
    if (this.playing.size > 0) { this.sessionActivity = Date.now(); this.lastActivity = Date.now(); }
    this.pendingDuration += elapsed;
    while (this.pendingDuration >= 60_000) { this.emit('engagement_flush', { duration_ms: 60_000 }); this.pendingDuration -= 60_000; }
  }
  private flushDuration() { this.tick(); if (this.pendingDuration >= 1000) { this.emit('engagement_flush', { duration_ms: Math.min(60_000, Math.round(this.pendingDuration)) }); this.pendingDuration = 0; } }
  private onVisibility = () => { if (document.visibilityState === 'hidden') { this.flushDuration(); void this.flush(true); } else this.lastTick = performance.now(); };
  private onPageHide = () => { this.flushDuration(); void this.flush(true); };
  private onFocus = () => { this.lastTick = performance.now(); };
  private onBlur = () => { this.flushDuration(); void this.flush(true); };
  private onStorage = (event: StorageEvent) => { if (event.key === CONSENT_KEY) { this.readConsent(); if (this.active() && !this.viewId && this.route) this.commitView(this.route, this.pageKey, this.slug, this.pageKind || 'page'); this.notify(); } };
  async flush(urgent = false) {
    if (!this.active() || this.sending || !this.queue.length) return;
    this.queue = this.queue.filter(item => Date.now() - item.at <= MAX_AGE_MS);
    if (!this.queue.length || this.queue[0].notBefore > Date.now()) return;
    const batch: Queued[] = []; let bytes = encoder.encode('{"schema_version":1,"events":[]}').length;
    for (const item of this.queue) { const size = encoder.encode(JSON.stringify(item.event)).length + 1; if (batch.length === 20 || bytes + size > MAX_BATCH_BYTES || item.notBefore > Date.now()) break; batch.push(item); bytes += size; }
    if (!batch.length) return;
    this.queue.splice(0, batch.length); const body = JSON.stringify({ schema_version: 1, events: batch.map(item => item.event) });
    if (urgent && navigator.sendBeacon && navigator.sendBeacon(this.endpoint, new Blob([body], { type: 'application/json' }))) return;
    this.sending = true;
    const controller = new AbortController(); this.sendController = controller;
    let retryable = true;
    try { const response = await fetch(this.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: urgent, mode: 'cors', signal: controller.signal }); if (!response.ok) { retryable = response.status === 429 || response.status >= 500; throw new Error('collector unavailable'); } }
    catch { if (this.active() && retryable) { const retry = batch.filter(item => item.retry < 2 && Date.now() - item.at <= MAX_AGE_MS).map(item => ({ ...item, retry: item.retry + 1, notBefore: Date.now() + 15_000 * (item.retry + 1) })); this.queue = [...retry, ...this.queue].slice(0, MAX_QUEUE); if (retry.length && !this.retryTimer) this.retryTimer = window.setTimeout(() => { this.retryTimer = 0; void this.flush(); }, 15_000 * retry[0].retry); } }
    finally { if (this.sendController === controller) this.sendController = null; this.sending = false; }
  }
}

export const analytics = new AnalyticsClient();
