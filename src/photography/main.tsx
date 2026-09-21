import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import { PhotographySite } from './PhotographySite';

createRoot(document.getElementById('root')!).render(<StrictMode><PhotographySite /></StrictMode>);
