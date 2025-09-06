import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/mobile.css';
import { initMobileClass } from './mobile';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ParentDashboard from './routes/ParentDashboard';
import ChildDashboard from './routes/ChildDashboard';
import { ToastProvider } from './components/Toast';

// Detect mobile and toggle native-like mobile styles early
initMobileClass();

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/parent" element={<ParentDashboard />} />
            <Route path="/child" element={<ChildDashboard />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </React.StrictMode>
  );
}
