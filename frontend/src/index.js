import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Note: StrictMode removed temporarily to fix Supabase auth abort issues
// This is a known issue with React 18 + Supabase in development
// StrictMode can be re-enabled in production builds
root.render(
  <App />
);