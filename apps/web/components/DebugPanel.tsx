'use client';

import { useState, useEffect } from 'react';
import { apiUrl } from '@/lib/api-url';

interface DebugInfo {
  /** Подпись: прямой API или same-origin /api */
  apiUrl: string;
  /** Фактический URL последнего health-запроса (абсолютный, если относительный /api) */
  resolvedHealthUrl: string;
  isOnline: boolean;
  apiStatus: 'checking' | 'online' | 'offline';
  lastCheck: Date | null;
  errorMessage: string | null;
  requests: Array<{
    id: number;
    url: string;
    method: string;
    status: number | null;
    time: string;
    duration: number;
  }>;
}

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [debug, setDebug] = useState<DebugInfo>({
    apiUrl: '',
    resolvedHealthUrl: '',
    isOnline: false,
    apiStatus: 'checking',
    lastCheck: null,
    errorMessage: null,
    requests: [],
  });

  const checkApiHealth = async () => {
    const healthUrl = apiUrl('/health');
    const apiBaseLabel = process.env.NEXT_PUBLIC_API_URL?.trim()
      ? `Direct: ${process.env.NEXT_PUBLIC_API_URL.trim().replace(/\/$/, '')}`
      : 'Same-origin /api (rewrites to Nest)';
    const resolvedHealthUrl = healthUrl.startsWith('http')
      ? healthUrl
      : `${typeof window !== 'undefined' ? window.location.origin : ''}${healthUrl}`;
    const startTime = performance.now();

    try {
      // Try health endpoint (non-versioned)
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const duration = performance.now() - startTime;

      setDebug(prev => ({
        ...prev,
        apiUrl: apiBaseLabel,
        resolvedHealthUrl,
        isOnline: response.ok,
        apiStatus: response.ok ? 'online' : 'offline',
        lastCheck: new Date(),
        errorMessage: response.ok ? null : `HTTP ${response.status}`,
        requests: [
          {
            id: Date.now(),
            url: healthUrl,
            method: 'GET',
            status: response.status,
            time: new Date().toLocaleTimeString(),
            duration: Math.round(duration),
          },
          ...prev.requests.slice(0, 9),
        ],
      }));
    } catch (error: any) {
      const duration = performance.now() - startTime;

      setDebug(prev => ({
        ...prev,
        apiUrl: apiBaseLabel,
        resolvedHealthUrl,
        isOnline: false,
        apiStatus: 'offline',
        lastCheck: new Date(),
        errorMessage: error.message || 'Network error',
        requests: [
          {
            id: Date.now(),
            url: healthUrl,
            method: 'GET',
            status: null,
            time: new Date().toLocaleTimeString(),
            duration: Math.round(duration),
          },
          ...prev.requests.slice(0, 9),
        ],
      }));
    }
  };

  useEffect(() => {
    checkApiHealth();
    const interval = setInterval(checkApiHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Debug Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          zIndex: 9999,
          padding: '12px 16px',
          background: debug.isOnline ? '#22c55e' : '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontWeight: '600',
          fontSize: '12px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLButtonElement).style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLButtonElement).style.transform = 'scale(1)';
        }}
      >
        {debug.isOnline ? '🟢 API OK' : '🔴 API ERROR'}
      </button>

      {/* Debug Panel */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '60px',
            left: '20px',
            zIndex: 9999,
            width: '400px',
            maxHeight: '500px',
            overflowY: 'auto',
            background: 'rgba(10, 10, 10, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            fontFamily: 'monospace',
            fontSize: '11px',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontWeight: '700', color: '#fff' }}>🔍 Debug Panel</span>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#a0a0a0',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '4px',
              }}
            >
              ✕
            </button>
          </div>

          {/* API Status */}
          <div style={{ padding: '12px 16px' }}>
            <div style={{ color: '#a0a0a0', marginBottom: '8px', fontWeight: '600' }}>
              API Connection
            </div>
            
            <div
              style={{
                padding: '10px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '6px',
                marginBottom: '12px',
              }}
            >
              <div style={{ marginBottom: '6px' }}>
                <span style={{ color: '#6b6b6b' }}>Mode: </span>
                <span style={{ color: '#d4af37' }}>{debug.apiUrl}</span>
              </div>
              {debug.resolvedHealthUrl && (
                <div style={{ marginBottom: '6px', wordBreak: 'break-all' }}>
                  <span style={{ color: '#6b6b6b' }}>Health: </span>
                  <span style={{ color: '#e0e0e0', fontSize: '11px' }}>{debug.resolvedHealthUrl}</span>
                </div>
              )}
              <div style={{ marginBottom: '6px' }}>
                <span style={{ color: '#6b6b6b' }}>Status: </span>
                <span style={{ 
                  color: debug.apiStatus === 'online' ? '#22c55e' : '#ef4444' 
                }}>
                  {debug.apiStatus.toUpperCase()}
                </span>
              </div>
              <div style={{ marginBottom: '6px' }}>
                <span style={{ color: '#6b6b6b' }}>Last Check: </span>
                <span style={{ color: '#e0e0e0' }}>
                  {debug.lastCheck?.toLocaleTimeString() || 'Never'}
                </span>
              </div>
              {debug.errorMessage && (
                <div>
                  <span style={{ color: '#6b6b6b' }}>Error: </span>
                  <span style={{ color: '#ef4444' }}>{debug.errorMessage}</span>
                </div>
              )}
            </div>

            <button
              onClick={checkApiHealth}
              style={{
                width: '100%',
                padding: '8px',
                background: 'rgba(212, 175, 55, 0.2)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                borderRadius: '6px',
                color: '#d4af37',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              ↻ Check Now
            </button>
          </div>

          {/* Request Log */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ color: '#a0a0a0', marginBottom: '8px', fontWeight: '600' }}>
              Request Log (Last 10)
            </div>
            
            {debug.requests.length === 0 ? (
              <div style={{ color: '#6b6b6b', fontStyle: 'italic' }}>
                No requests yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {debug.requests.map((req) => (
                  <div
                    key={req.id}
                    style={{
                      padding: '8px',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '4px',
                      borderLeft: `3px solid ${
                        req.status === 200 ? '#22c55e' :
                        req.status === 401 ? '#eab308' :
                        req.status === 404 ? '#f59e0b' :
                        req.status === 500 ? '#ef4444' :
                        '#6b6b6b'
                      }`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ 
                        fontWeight: '700', 
                        color: req.method === 'GET' ? '#3b82f6' : '#8b5cf6' 
                      }}>
                        {req.method}
                      </span>
                      <span style={{ color: '#6b6b6b' }}>{req.time}</span>
                    </div>
                    <div style={{ color: '#a0a0a0', marginBottom: '4px', wordBreak: 'break-all' }}>
                      {req.url}
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <span style={{ 
                        color: req.status === 200 ? '#22c55e' : 
                               req.status === 401 ? '#eab308' : 
                               req.status === 500 ? '#ef4444' : '#6b6b6b' 
                      }}>
                        {req.status ? `HTTP ${req.status}` : 'FAILED'}
                      </span>
                      <span style={{ color: '#6b6b6b' }}>{req.duration}ms</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Environment Info */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ color: '#a0a0a0', marginBottom: '8px', fontWeight: '600' }}>
              Environment
            </div>
            <div
              style={{
                padding: '10px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '6px',
              }}
            >
              <div style={{ marginBottom: '4px' }}>
                <span style={{ color: '#6b6b6b' }}>NODE_ENV: </span>
                <span style={{ color: '#e0e0e0' }}>development</span>
              </div>
              <div>
                <span style={{ color: '#6b6b6b' }}>Next.js: </span>
                <span style={{ color: '#e0e0e0' }}>15.x</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
