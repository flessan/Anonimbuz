// web/src/pages/Register.jsx

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { Turnstile } from '@marsidev/react-turnstile';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');

  async function submit(e) {
    e.preventDefault();
    setErr('');

    if (!turnstileToken) {
      setErr('Selesaikan verifikasi keamanan terlebih dahulu.');
      return;
    }

    setBusy(true);
    try {
      const result = await register(username, password, displayName || username, turnstileToken);

      if (result.success) {
        navigate('/');
      } else {
        setErr(result.error || 'Gagal mendaftar');
      }
    } catch (e) {
      setErr(e.response?.data?.error || 'Gagal mendaftar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card form-card" onSubmit={submit}>
      <h2>Daftar di Anonimbuz</h2>
      <div className="field">
        <label>Username (3-20, huruf/angka/_)</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
      </div>
      <div className="field">
        <label>Nama tampilan</label>
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </div>
      <div className="field">
        <label>Password (minimal 8 karakter)</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>

      <div className="field" style={{ marginBottom: 16, marginTop: 8 }}>
        <Turnstile
          siteKey="0x4AAAAAADptq3u1zNIT7v01"
          onSuccess={(token) => setTurnstileToken(token)}
          onExpire={() => setTurnstileToken('')}
          onError={() => setErr('Gagal memuat sistem keamanan.')}
        />
      </div>

      <button type="submit" disabled={busy || !turnstileToken}>
        {busy ? '...' : 'Daftar'}
      </button>

      {err && <div className="error">{err}</div>}
      <p className="muted" style={{ marginTop: 16 }}>
        Sudah punya akun? <Link to="/login">Masuk</Link>
      </p>
    </form>
  );
}