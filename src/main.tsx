import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './sw-register';

// Register Service Worker for offline capability
registerServiceWorker();

createRoot(document.getElementById('root')!).render(<App />);
