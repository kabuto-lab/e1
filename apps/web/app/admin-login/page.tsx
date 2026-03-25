/**
 * Admin Login Page
 * JWT Authentication for admin users
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('🔐 Admin Login: Attempting login for', username);

    try {
      // Try both endpoints - first without version, then with /v1
      let response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: username,
          password: password
        }),
      });

      // If 404, try /v1/auth/login
      if (response.status === 404) {
        console.log('🔐 Admin Login: /auth/login not found, trying /v1/auth/login');
        response = await fetch(`${API_URL}/v1/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: username,
            password: password
          }),
        });
      }

      const data = await response.json();

      console.log('🔐 Admin Login: Response status', response.status);
      console.log('🔐 Admin Login: Response data', data);

      if (!response.ok) {
        if (data.message && data.errors) {
          setError(`${data.message}: ${JSON.stringify(data.errors)}`);
        } else {
          setError(data.message || 'Login failed');
        }
        return;
      }

      // Check if user is admin
      if (data.user.role !== 'admin') {
        throw new Error('Access denied. Admin role required.');
      }

      // Success - save JWT tokens and redirect
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      console.log('🔐 Admin Login: Success, redirecting to dashboard');

      // Redirect to dashboard
      router.push('/dashboard');

    } catch (err: any) {
      console.error('❌ Admin Login: Error', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'rgba(26, 26, 26, 0.8)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(212, 175, 55, 0.2)',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #d4af37 0%, #f4d03f 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '8px',
          }}>
            Lovnge Admin
          </h1>
          <p style={{ color: '#6b6b6b', fontSize: '14px' }}>
            Панель администратора
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '10px',
            color: '#ef4444',
            fontSize: '14px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#a0a0a0',
              fontSize: '13px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Email
            </label>
            <input
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="admin@lovnge.local"
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(212, 175, 55, 0.2)',
                borderRadius: '10px',
                color: '#e0e0e0',
                fontSize: '15px',
                outline: 'none',
                transition: 'all 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                (e.target as HTMLInputElement).style.borderColor = 'rgba(212, 175, 55, 0.5)';
                (e.target as HTMLInputElement).style.background = 'rgba(0, 0, 0, 0.6)';
              }}
              onBlur={(e) => {
                (e.target as HTMLInputElement).style.borderColor = 'rgba(212, 175, 55, 0.2)';
                (e.target as HTMLInputElement).style.background = 'rgba(0, 0, 0, 0.4)';
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#a0a0a0',
              fontSize: '13px',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(212, 175, 55, 0.2)',
                borderRadius: '10px',
                color: '#e0e0e0',
                fontSize: '15px',
                outline: 'none',
                transition: 'all 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                (e.target as HTMLInputElement).style.borderColor = 'rgba(212, 175, 55, 0.5)';
                (e.target as HTMLInputElement).style.background = 'rgba(0, 0, 0, 0.6)';
              }}
              onBlur={(e) => {
                (e.target as HTMLInputElement).style.borderColor = 'rgba(212, 175, 55, 0.2)';
                (e.target as HTMLInputElement).style.background = 'rgba(0, 0, 0, 0.4)';
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              background: loading
                ? 'rgba(212, 175, 55, 0.5)'
                : 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
              border: 'none',
              borderRadius: '10px',
              color: loading ? '#666' : '#0a0a0a',
              fontSize: '15px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                (e.target as HTMLButtonElement).style.boxShadow = '0 10px 30px rgba(212, 175, 55, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.target as HTMLButtonElement).style.boxShadow = 'none';
            }}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        {/* Demo Credentials */}
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'rgba(212, 175, 55, 0.05)',
          border: '1px solid rgba(212, 175, 55, 0.1)',
          borderRadius: '10px',
          textAlign: 'center',
        }}>
          <p style={{
            color: '#8b8b8b',
            fontSize: '12px',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            🔐 Тестовый доступ
          </p>
          <p style={{
            color: '#a0a0a0',
            fontSize: '11px',
            fontFamily: 'monospace',
          }}>
            admin@lovnge.local / Admin123!
          </p>
        </div>

        {/* Back to Site */}
        <div style={{
          marginTop: '20px',
          textAlign: 'center',
        }}>
          <a
            href="/"
            style={{
              color: '#6b6b6b',
              fontSize: '13px',
              textDecoration: 'none',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.target as HTMLAnchorElement).style.color = '#d4af37'}
            onMouseLeave={(e) => (e.target as HTMLAnchorElement).style.color = '#6b6b6b'}
          >
            ← Вернуться на сайт
          </a>
        </div>
      </div>
    </div>
  );
}
