import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, Loader2, AlertCircle, MapPin } from 'lucide-react';
import './LoginPage.css';

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
    <div className="login-container-clean">
      <div className="login-card-clean">
        <div className="text-center">
          <div className="login-logo-box">
            <img src="/logosanatorio.png" alt="Sanatorio Argentino" className="login-logo-img" />
          </div>
          <h2 className="login-title-clean">Hub Sanatorio Argentino</h2>
          <p className="login-subtitle-clean">Portal centralizado de acceso institucional</p>
        </div>

        {error && (
          <div className="login-error-banner">
            <AlertCircle className="login-error-icon" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form-space">
          <div className="input-group-clean">
            <label className="input-label-text">Correo electrónico</label>
            <div className="input-wrapper">
              <input
                type="email"
                required
                className="input-field-clean"
                placeholder="usuario@sanatorioargentino.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email"
              />
              <Mail className="input-icon-clean" />
            </div>
          </div>

          <div className="input-group-clean">
            <label className="input-label-text">Contraseña</label>
            <div className="input-wrapper">
              <input
                type="password"
                required
                className="input-field-clean"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
              />
              <Lock className="input-icon-clean" />
            </div>
          </div>

          {geoStatus !== 'idle' && (
            <div className={`geo-status-clean geo-status-clean--${geoStatus}`}>
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

          <button
            type="submit"
            disabled={isLoading || !email.trim() || !password.trim()}
            className="submit-btn-clean"
          >
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        <p className="login-disclaimer">
          <MapPin size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
          Se requiere permiso de ubicación para ingresar.
          <br />
          Tu sesión será registrada por seguridad institucional.
        </p>
      </div>
    </div>
  );
}
