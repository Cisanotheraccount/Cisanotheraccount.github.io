/// <reference types="vite/client" />
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PhotographySite } from './PhotographySite';
import { analytics } from '../shared/analytics/client';
import { AnalyticsConsent } from '../shared/analytics/Consent';

const collectorOrigin = import.meta.env.VITE_ANALYTICS_COLLECTOR_ORIGIN ?? '';
analytics.configure('photography', collectorOrigin ? `${collectorOrigin.replace(/\/+$/, '')}/v1/events` : '', import.meta.env.VITE_ANALYTICS_ENABLED === 'true' && !location.pathname.startsWith('/zh/'), import.meta.env.VITE_ANALYTICS_CAMPAIGN_TAGS ?? '');
createRoot(document.getElementById('root')!).render(<StrictMode><PhotographySite /><AnalyticsConsent surface="photography" /></StrictMode>);
