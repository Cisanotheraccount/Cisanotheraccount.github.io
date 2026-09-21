import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PhotographySite } from './PhotographySite';

createRoot(document.getElementById('root')!).render(<StrictMode><PhotographySite /></StrictMode>);
