import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FaGoogle } from 'react-icons/fa';

export default function Login() {
    const { login } = useAuth();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleLogin() {
        try {
            setError("");
            setLoading(true);
            await login();
        } catch (err) {
            console.error("登入錯誤:", err);
            setError(err.message || "登入失敗");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            backgroundColor: 'var(--bg-color)',
            padding: '20px'
        }}>
            <h1 style={{ marginBottom: '2rem', fontWeight: '300', letterSpacing: '2px' }}>JAPAN TRAVEL</h1>

            {error && <div style={{ marginBottom: '1rem', color: '#d32f2f', backgroundColor: '#ffebee', padding: '10px', borderRadius: '4px', maxWidth: '300px', wordWrap: 'break-word', textAlign: 'center' }}>
                處理登入時發生錯誤：<br />{error}
            </div>}

            <button
                onClick={handleLogin}
                disabled={loading}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 24px',
                    backgroundColor: '#fff',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-sm)',
                    fontSize: '16px',
                    color: '#333',
                    transition: 'all 0.2s ease',
                    opacity: loading ? 0.7 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer'
                }}
            >
                <FaGoogle size={20} color="#DB4437" />
                {loading ? '正在登入...' : 'Sign in with Google'}
            </button>
        </div>
    );
}
