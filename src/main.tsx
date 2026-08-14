import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupNativeFetchInterceptor } from './utils/apiConfig.ts';

// Intercept relative /api calls in native iOS / Android Capacitor webviews
setupNativeFetchInterceptor();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

