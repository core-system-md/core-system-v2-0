// ============================================================
// CORE SYSTEM v2.1 — Entry Point
// Constitution §1: React 18+ + Vite + TypeScript (strict)
// ============================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
