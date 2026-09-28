import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { analytics } from './client';
import './consent.css';

export function AnalyticsConsent({ surface }: { surface: 'portfolio' | 'photography' }) {
  const [, update] = useState(0);
  const [details, setDetails] = useState(false);
  const [topDialog, setTopDialog] = useState<Element | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  useEffect(() => analytics.subscribe(() => update(value => value + 1)), []);
  useEffect(() => {
    const find = () => setTopDialog(document.querySelector('dialog.gxc-detail-dialog[open], dialog.photo-dialog[open]'));
    find();
    const observer = new MutationObserver(find);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (details) document.querySelector<HTMLButtonElement>('.gxc-analytics-dismiss')?.focus({ preventScroll: true });
    else if (opener.current) {
      const target = opener.current.isConnected ? opener.current : document.querySelector<HTMLButtonElement>('.gxc-analytics-settings');
      target?.focus({ preventScroll: true }); opener.current = null;
    }
  }, [details, topDialog]);
  if (!analytics.enabled) return null;
  const choice = analytics.choice;
  return createPortal(<aside className="gxc-analytics" data-surface={surface} aria-label="Privacy choices">
    {choice === null && <div className="gxc-analytics-prompt">
      <p>May I use optional analytics to understand visits and improve this site? You can keep browsing without making a choice. Your choice lasts 90 days.</p>
      <div className="gxc-analytics-actions"><button type="button" onClick={() => analytics.accept()}>Accept</button><button type="button" onClick={() => analytics.decline()}>Decline</button><button type="button" onClick={event => { opener.current = event.currentTarget; setDetails(true); }}>Privacy details</button></div>
    </div>}
    {choice !== null && <button type="button" className="gxc-analytics-settings" onClick={event => { opener.current = event.currentTarget; setDetails(true); }}>Privacy settings</button>}
    {details && <div className="gxc-analytics-details" role="dialog" aria-modal="false" aria-label="Analytics privacy details" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); setDetails(false); } }}>
      <button type="button" className="gxc-analytics-dismiss" onClick={() => setDetails(false)} aria-label="Close privacy details">×</button>
      <h2>Privacy and analytics</h2>
      <p>With your consent, this site records page and project views, navigation, media interactions, coarse scroll depth, effective reading time, and outbound link clicks. It uses a random browser ID to recognize return visits for up to 90 days. No analytics identifier or behavior is recorded before you accept.</p>
      <p>Events go to a Cloudflare Worker and short-term D1 buffer, then to a private NAS database. The collector derives coarse geography and network organization from request metadata; these are clues about a network, not a person. Infrastructure providers process connection data to deliver the site and service. This site does not send full IP addresses, full referrer URLs, free text, or precise location as analytics fields.</p>
      <p>Consent and the random ID expire after 90 days. You can withdraw at any time; withdrawal clears this browser’s pending events and tracking state. It does not erase previously stored server records. The cloud event buffer keeps unsynced events for up to 30 days and synced events for about 7 days. NAS detail is kept for at most 365 days, with older records removed sooner if capacity requires it. Aggregates without browser or session IDs are kept for 13 months.</p>
      <div className="gxc-analytics-actions"><button type="button" onClick={() => { if (choice !== 'accepted') analytics.accept(); setDetails(false); }}>{choice === 'accepted' ? 'Keep analytics on' : 'Accept analytics'}</button><button type="button" onClick={() => { analytics.decline(); setDetails(false); }}>Decline analytics</button>{choice === 'accepted' && <button type="button" onClick={() => { analytics.revoke(); setDetails(false); }}>Withdraw consent</button>}</div>
    </div>}
  </aside>, topDialog ?? document.body);
}
