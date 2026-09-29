import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { analytics } from './client';
import { ConsentGlass } from './ConsentGlass';
import './consent.css';

const OPEN_PRIVACY = 'gxc:open-privacy';

/** A normal footer control: scrolls with the page and never floats over content. */
export function AnalyticsPrivacyLink() {
  if (!analytics.enabled) return null;
  return <button type="button" className="gxc-privacy-link" aria-haspopup="dialog" onClick={event => {
    window.dispatchEvent(new CustomEvent(OPEN_PRIVACY, { detail: event.currentTarget }));
  }}>Privacy</button>;
}

export function AnalyticsConsent({ surface }: { surface: 'portfolio' | 'photography' }) {
  const [, update] = useState(0);
  const [details, setDetails] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [storageFailed, setStorageFailed] = useState(false);
  const [topDialog, setTopDialog] = useState<Element | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const closeButton = useRef<HTMLButtonElement | null>(null);
  useEffect(() => analytics.subscribe(() => { setDismissed(false); update(value => value + 1); }), []);
  useEffect(() => {
    const open = (event: Event) => {
      opener.current = (event as CustomEvent<HTMLButtonElement>).detail;
      setDetails(true);
    };
    window.addEventListener(OPEN_PRIVACY, open);
    return () => window.removeEventListener(OPEN_PRIVACY, open);
  }, []);
  useEffect(() => {
    const find = () => setTopDialog(document.querySelector('dialog.gxc-detail-dialog[open], dialog.photo-dialog[open]'));
    find();
    const observer = new MutationObserver(find);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (details) closeButton.current?.focus({ preventScroll: true });
    else if (opener.current) {
      const target = opener.current.isConnected ? opener.current : document.querySelector<HTMLButtonElement>('.gxc-analytics-text');
      target?.focus({ preventScroll: true });
      opener.current = null;
    }
  }, [details, topDialog]);
  if (!analytics.enabled) return null;
  const choice = analytics.choice;
  const tracking = analytics.tracking;
  const choose = (next: 'accepted' | 'declined') => {
    const saved = next === 'accepted' ? analytics.accept() : analytics.decline();
    setStorageFailed(saved === false);
    setDismissed(true);
    setDetails(false);
  };
  if (!details && (choice !== null || dismissed)) return null;
  return createPortal(<aside className="gxc-analytics" data-surface={surface} aria-label="Privacy choices">
    {!details && <ConsentGlass className="gxc-analytics-prompt" variant="prompt">
      <p>Allow optional visit analytics?</p>
      <div className="gxc-analytics-actions"><button type="button" onClick={() => choose('accepted')}>Accept</button><button type="button" onClick={() => choose('declined')}>Decline</button></div>
      <button type="button" className="gxc-analytics-text" aria-haspopup="dialog" onClick={event => { opener.current = event.currentTarget; setDetails(true); }}>Details</button>
    </ConsentGlass>}
    {details && <ConsentGlass className="gxc-analytics-details" variant="details" role="dialog" aria-modal="false" aria-labelledby="gxc-privacy-title" onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setDetails(false); }
      }}>
      <button ref={closeButton} type="button" className="gxc-analytics-dismiss" onClick={() => setDetails(false)} aria-label="Close privacy details">×</button>
      <h2 id="gxc-privacy-title">Visit analytics</h2>
      <p>Optional analytics help me understand which pages and projects are useful. They include clicks, media interactions, scroll depth, and active reading time.</p>
      <p>Approximate city, region, country, and network organization may be available. These describe a connection, not a person. Full IP addresses and precise location are not saved in analytics.</p>
      <p>Your new choice lasts one year. Anonymous browser IDs last up to 90 days. You can change your choice here at any time.</p>
      <details><summary>Storage and retention</summary>
        <p>No behavior is recorded before you accept. An existing choice keeps its original expiry. Clearing browser data may show the prompt again; if your browser cannot save a choice, analytics stay off.</p>
        <p>Events go through Cloudflare to a private NAS database. Infrastructure providers process connection data to deliver the site. Analytics exclude full referrer URLs and free text.</p>
        <p>The cloud buffer keeps unsynced events for up to 30 days and synced events for about 7 days. NAS event details are kept for at most 365 days, or less if capacity requires it. Aggregates without browser or session IDs are kept for 13 months.</p>
        <p>Turning analytics off clears this browser’s pending events and identifier. It remembers your decline for one year, but does not erase previously stored server records.</p>
      </details>
      <p className="gxc-analytics-status" role="status">{storageFailed || (choice === 'accepted' && !tracking) ? 'Analytics are off. This browser could not save your choice.' : tracking ? 'Analytics are on.' : 'Analytics are off.'}</p>
      <div className="gxc-analytics-actions"><button type="button" onClick={() => { if (tracking) setDetails(false); else choose('accepted'); }}>{tracking ? 'Keep on' : 'Accept'}</button><button type="button" onClick={() => choose('declined')}>{choice === 'accepted' ? 'Turn off' : 'Decline'}</button></div>
    </ConsentGlass>}
  </aside>, topDialog ?? document.body);
}
