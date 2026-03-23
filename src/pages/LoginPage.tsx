import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, MapPin, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setError('');
    setIsLoading(true);
    setGeoStatus('requesting');

    const result = await login(email.trim(), password.trim());

    if (result.success) {
      setGeoStatus('granted');
      // Navigation handled by App.tsx routing
    } else {
      setGeoStatus(result.error?.includes('ubicación') || result.error?.includes('geolocalización') ? 'denied' : 'idle');
      setError(result.error || 'Error desconocido');
    }

    setIsLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card__logo">
          <Shield size={32} color="white" />
        </div>

        <h1 className="login-card__title">Hub Sanatorio Argentino</h1>
        <p className="login-card__subtitle">Portal centralizado de acceso institucional</p>

        {error && (
          <div className="alert alert--error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">
              Correo electrónico
            </label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="usuario@sanatorioargentino.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              Contraseña
            </label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="current-password"
              required
            />
          </div>

          {geoStatus !== 'idle' && (
            <div className={`geo-status geo-status--${geoStatus === 'requesting' ? 'requesting' : geoStatus === 'granted' ? 'granted' : 'denied'}`}>
              {geoStatus === 'requesting' && (
                <>
                  <Loader2 size={16} className="spinner" style={{ border: 'none', animation: 'spin 0.6s linear infinite' }} />
                  <span>Verificando ubicación...</span>
                </>
              )}
              {geoStatus === 'granted' && (
                <>
                  <MapPin size={16} />
                  <span>Ubicación verificada ✓</span>
                </>
              )}
              {geoStatus === 'denied' && (
                <>
                  <AlertCircle size={16} />
                  <span>Ubicación requerida para acceder</span>
                </>
              )}
            </div>
          )}

          <div style={{ marginTop: '24px' }}>
            <button
              type="submit"
              className="btn btn--primary btn--full"
              disabled={isLoading || !email.trim() || !password.trim()}
            >
              {isLoading ? (
                <>
                  <div className="spinner" />
                  Ingresando...
                </>
              ) : (
                <>
                  <Shield size={18} />
                  Ingresar al Hub
                </>
              )}
            </button>
          </div>
        </form>

        <p style={{
          textAlign: 'center',
          fontSize: '11px',
          color: 'var(--sa-slate-400)',
          marginTop: '24px',
          lineHeight: '1.5',
        }}>
          <MapPin size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
          Se requiere permiso de ubicación para ingresar.
          <br />
          Tu sesión será registrada por seguridad institucional.
        </p>
      </div>
    </div>
  );
}
