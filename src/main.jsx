import React from 'react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div style={{ padding: '20px', backgroundColor: '#ffebee', color: '#c62828', minHeight: '100vh', fontFamily: 'sans-serif' }}>
          <h2>應用程式發生錯誤 🐛</h2>
          <p>以下是詳細的錯誤訊息，請把這段文字複製貼上給 AI：</p>
          <pre style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '4px', border: '1px solid #ef9a9a', overflowX: 'auto' }}>
            {this.state.error && this.state.error.toString()}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

