import { useState, useEffect, useCallback } from 'react';
import { fetchRecentLogs } from '../services/auditService';
import type { HubLogSesion } from '../types';
import {
  Eye, RefreshCw, Shield, Clock, MapPin,
  Globe, Monitor, LogIn, LogOut, AlertTriangle,
  Camera, Loader2,
} from 'lucide-react';

const EVENT_CONFIG: Record<string, { label: string; color: string; Icon: React.ComponentType<{ size?: number }> }> = {
  login: { label: 'Login', color: 'var(--sa-green-500)', Icon: LogIn },
  logout: { label: 'Logout', color: 'var(--sa-slate-400)', Icon: LogOut },
  access_system: { label: 'Acceso a Sistema', color: 'var(--sa-blue-500)', Icon: Monitor },
  denied: { label: 'Acceso Denegado', color: 'var(--sa-red-500)', Icon: AlertTriangle },
  screenshot_attempt: { label: '📸 Captura', color: '#f97316', Icon: Camera },
};

export default function MonitorPage() {
  const [logs, setLogs] = useState<HubLogSesion[]>([]);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(24);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadLogs = useCallback(async () => {
    const data = await fetchRecentLogs(hours);
    setLogs(data as HubLogSesion[]);
    setLoading(false);
  }, [hours]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadLogs, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadLogs]);

  const activeSessions = logs.filter((l) => l.evento === 'login').length;
  const deniedAttempts = logs.filter((l) => l.evento === 'denied').length;
  const systemAccesses = logs.filter((l) => l.evento === 'access_system').length;

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const parseBrowser = (ua: string | null): string => {
    if (!ua) return '—';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Otro';
  };

  const parseOS = (ua: string | null): string => {
    if (!ua) return '—';
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'Otro';
  };

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">
          <Eye size={28} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
          Monitor de Sesiones
        </h1>
        <p className="page__subtitle">
          Trazabilidad en tiempo real — Panel exclusivo TyS
        </p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card animate-fade-in" style={{ animationDelay: '0.05s' }}>
          <div className="stat-card__icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--sa-green-600)' }}>
            <LogIn size={24} />
          </div>
          <div>
            <div className="stat-card__value">{activeSessions}</div>
            <div className="stat-card__label">Logins ({hours}h)</div>
          </div>
        </div>
        <div className="stat-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="stat-card__icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--sa-blue-600)' }}>
            <Monitor size={24} />
          </div>
          <div>
            <div className="stat-card__value">{systemAccesses}</div>
            <div className="stat-card__label">Accesos a Sistemas</div>
          </div>
        </div>
        <div className="stat-card animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <div className="stat-card__icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--sa-red-600)' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="stat-card__value">{deniedAttempts}</div>
            <div className="stat-card__label">Accesos Denegados</div>
          </div>
        </div>
        <div className="stat-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="stat-card__icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#7c3aed' }}>
            <Clock size={24} />
          </div>
          <div>
            <div className="stat-card__value">{logs.length}</div>
            <div className="stat-card__label">Eventos Totales</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px',
        flexWrap: 'wrap',
      }}>
        <select
          className="form-input"
          style={{ width: 'auto' }}
          value={hours}
          onChange={(e) => { setHours(Number(e.target.value)); setLoading(true); }}
        >
          <option value={1}>Última hora</option>
          <option value={6}>Últimas 6 horas</option>
          <option value={24}>Últimas 24 horas</option>
          <option value={72}>Últimas 72 horas</option>
          <option value={168}>Última semana</option>
        </select>

        <button
          className="btn btn--secondary btn--sm"
          onClick={() => { setLoading(true); loadLogs(); }}
        >
          <RefreshCw size={14} /> Actualizar
        </button>

        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '13px',
          color: 'var(--color-text-secondary)',
          cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          Auto-refresh (30s)
        </label>

        {autoRefresh && (
          <span className="badge badge--green" style={{ marginLeft: 'auto' }}>
            <span className="session-dot session-dot--active" /> EN VIVO
          </span>
        )}
      </div>

      {/* Logs Table */}
      <div className="table-container animate-fade-in">
        <div className="table-container__header">
          <h3 className="table-container__title">
            <Shield size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
            Registro de Auditoría
          </h3>
        </div>

        {loading ? (
          <div className="empty-state">
            <Loader2 size={32} style={{ margin: '0 auto', animation: 'spin 0.6s linear infinite' }} />
            <p className="empty-state__text" style={{ marginTop: '12px' }}>Cargando eventos...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <Eye size={48} className="empty-state__icon" />
            <h3 className="empty-state__title">Sin eventos</h3>
            <p className="empty-state__text">No se registraron eventos en el periodo seleccionado.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Evento</th>
                <th>Usuario</th>
                <th>Sistema</th>
                <th>IP</th>
                <th>Ubicación</th>
                <th>Dispositivo</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const config = EVENT_CONFIG[log.evento] || EVENT_CONFIG.login;
                const EventIcon = config.Icon;
                const profile = log.hub_perfiles as { display_name?: string; sector?: string } | undefined;

                return (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '13px' }}>
                      <Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px', color: 'var(--color-text-secondary)' }} />
                      {formatTime(log.created_at)}
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: `${config.color}15`,
                          color: config.color,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <EventIcon size={12} />
                        {config.label}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      {profile?.display_name || '—'}
                    </td>
                    <td>
                      {(log.hub_sistemas as { display_name?: string } | undefined)?.display_name || '—'}
                    </td>
                    <td style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                      <Globe size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px', color: 'var(--color-text-secondary)' }} />
                      {log.ip_address || '—'}
                    </td>
                    <td style={{ fontSize: '12px' }}>
                      {log.latitud && log.longitud ? (
                        <a
                          href={`https://www.google.com/maps?q=${log.latitud},${log.longitud}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Ver en Google Maps"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: 'var(--sa-primary)',
                            textDecoration: 'none',
                            fontWeight: 600,
                            padding: '4px 8px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(0, 84, 139, 0.05)',
                            transition: 'all var(--transition-fast)',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0, 84, 139, 0.12)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0, 84, 139, 0.05)'; }}
                        >
                          <MapPin size={12} color="var(--sa-red-500)" />
                          {log.latitud.toFixed(4)}, {log.longitud.toFixed(4)}
                        </a>
                      ) : '—'}
                    </td>
                    <td style={{ fontSize: '12px' }}>
                      {parseBrowser(log.user_agent)} / {parseOS(log.user_agent)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
