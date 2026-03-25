/**
 * Auth Debug Page
 * Use this to diagnose auth issues
 * Access at: http://localhost:3001/auth-debug
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';

export default function AuthDebugPage() {
  const { user, loading, login, logout } = useAuth();
  const router = useRouter();
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const clearStorage = () => {
    localStorage.clear();
    addLog('✅ LocalStorage cleared');
    setLogs(['LocalStorage cleared']);
  };

  const setTestAdmin = () => {
    const testUser = {
      id: 'test-admin-123',
      email: 'admin@lovnge.local',
      role: 'admin',
      status: 'active'
    };
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LWFkbWluLTEyMyIsInJvbGUiOiJhZG1pbiIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3MTE5NzQ0MDAsImV4cCI6OTk5OTk5OTk5OX0.test_signature';
    
    localStorage.setItem('accessToken', testToken);
    localStorage.setItem('refreshToken', testToken);
    localStorage.setItem('user', JSON.stringify(testUser));
    addLog('✅ Test admin credentials set');
  };

  const setTestClient = () => {
    const testUser = {
      id: 'test-client-456',
      email: 'test@test.com',
      role: 'client',
      status: 'active'
    };
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LWNsaWVudC00NTYiLCJyb2xlIjoiY2xpZW50IiwidHlwZSI6ImFjY2VzcyIsImlhdCI6MTcxMTk3NDQwMCwiZXhwIjo5OTk5OTk5OTk5fQ.test_signature';
    
    localStorage.setItem('accessToken', testToken);
    localStorage.setItem('refreshToken', testToken);
    localStorage.setItem('user', JSON.stringify(testUser));
    addLog('✅ Test client credentials set');
  };

  const checkToken = () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      addLog('❌ No token found');
      return;
    }
    
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        addLog('❌ Invalid token format (not 3 parts)');
        return;
      }
      
      const payload = JSON.parse(atob(parts[1]));
      addLog(`✅ Token decoded: ${JSON.stringify(payload)}`);
      
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        addLog(`⚠️ Token EXPIRED! Exp: ${new Date(payload.exp * 1000).toISOString()}`);
      } else {
        addLog(`✅ Token is valid. Exp: ${payload.exp ? new Date(payload.exp * 1000).toISOString() : 'never'}`);
      }
    } catch (err: any) {
      addLog(`❌ Failed to decode token: ${err.message}`);
    }
  };

  useEffect(() => {
    addLog(`🔄 Auth state changed: loading=${loading}, user=${user ? user.email : 'null'}`);
  }, [user, loading]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-white mb-6">🔍 Auth Debug Panel</h1>

        {/* Current State */}
        <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Current State</h2>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Loading:</span>
              <span className={loading ? 'text-yellow-500' : 'text-green-500'}>
                {loading ? 'true' : 'false'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">User:</span>
              {user ? (
                <span className="text-green-500">
                  {user.email} ({user.role})
                </span>
              ) : (
                <span className="text-red-500">null</span>
              )}
            </div>
          </div>
        </div>

        {/* LocalStorage */}
        <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">LocalStorage</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>
              <span className="text-gray-400">accessToken:</span>
              <div className="mt-1 p-2 bg-black/50 rounded text-xs break-all text-gray-300">
                {localStorage.getItem('accessToken') || 'null'}
              </div>
            </div>
            <div>
              <span className="text-gray-400">refreshToken:</span>
              <div className="mt-1 p-2 bg-black/50 rounded text-xs break-all text-gray-300">
                {localStorage.getItem('refreshToken') || 'null'}
              </div>
            </div>
            <div>
              <span className="text-gray-400">user:</span>
              <div className="mt-1 p-2 bg-black/50 rounded text-xs break-all text-gray-300">
                {localStorage.getItem('user') || 'null'}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={clearStorage}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all"
            >
              🗑️ Clear Storage
            </button>
            <button
              onClick={checkToken}
              className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all"
            >
              🔍 Check Token
            </button>
            <button
              onClick={setTestAdmin}
              className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-all"
            >
              👑 Set Test Admin
            </button>
            <button
              onClick={setTestClient}
              className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-all"
            >
              👤 Set Test Client
            </button>
            <button
              onClick={() => logout()}
              className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-all col-span-2"
            >
              🚪 Logout
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Navigation</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-[#d4af37]/20 hover:bg-[#d4af37]/30 text-[#d4af37] rounded-lg transition-all"
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 bg-[#d4af37]/20 hover:bg-[#d4af37]/30 text-[#d4af37] rounded-lg transition-all"
            >
              🔑 Login
            </button>
            <button
              onClick={() => router.push('/admin-login')}
              className="px-4 py-2 bg-[#d4af37]/20 hover:bg-[#d4af37]/30 text-[#d4af37] rounded-lg transition-all"
            >
              👔 Admin Login
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-[#d4af37]/20 hover:bg-[#d4af37]/30 text-[#d4af37] rounded-lg transition-all"
            >
              🏠 Home
            </button>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Logs</h2>
          <div className="bg-black/50 rounded-lg p-4 max-h-64 overflow-y-auto font-mono text-xs space-y-1">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="text-gray-300">{log}</div>
              ))
            )}
          </div>
          <button
            onClick={() => setLogs([])}
            className="mt-2 px-4 py-2 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 rounded-lg transition-all text-sm"
          >
            Clear Logs
          </button>
        </div>
      </div>
    </div>
  );
}
