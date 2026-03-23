import { useState, useEffect } from 'react';
import { fetchAllSystems } from '../services/systemService';
import type { HubSistema } from '../types';
import {
  Briefcase, ExternalLink, CheckCircle,
  XCircle, Loader2, MonitorSmartphone,
  ClipboardList, BarChart3, Users, Stethoscope,
  Phone, FileText, Building2, Activity, ShieldCheck, Mic
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  'clipboard-list': ClipboardList,
  'bar-chart-3': BarChart3,
  'users': Users,
  'stethoscope': Stethoscope,
  'monitor-smartphone': MonitorSmartphone,
  'phone': Phone,
  'file-text': FileText,
  'building-2': Building2,
  'activity': Activity,
  'shield-check': ShieldCheck,
  'mic': Mic,
};

export default function PortfolioPage() {
  const [systems, setSystems] = useState<HubSistema[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await fetchAllSystems();
      setSystems(data);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">
          <Briefcase size={28} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
          Portfolio de Sistemas
        </h1>
        <p className="page__subtitle">
          Inventario institucional de todas las herramientas digitales activas — Panel exclusivo TyS / RRHH
        </p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--sa-blue-600)' }}>
            <MonitorSmartphone size={24} />
          </div>
          <div>
            <div className="stat-card__value">{systems.length}</div>
            <div className="stat-card__label">Sistemas Totales</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--sa-green-600)' }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <div className="stat-card__value">{systems.filter((s) => s.activo).length}</div>
            <div className="stat-card__label">Activos</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--sa-red-600)' }}>
            <XCircle size={24} />
          </div>
          <div>
            <div className="stat-card__value">{systems.filter((s) => !s.activo).length}</div>
            <div className="stat-card__label">Inactivos</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card">
          <div className="empty-state">
            <Loader2 size={32} style={{ margin: '0 auto', animation: 'spin 0.6s linear infinite' }} />
            <p className="empty-state__text" style={{ marginTop: '12px' }}>Cargando portfolio...</p>
          </div>
        </div>
      ) : systems.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Briefcase size={48} className="empty-state__icon" />
            <h3 className="empty-state__title">Sin sistemas registrados</h3>
            <p className="empty-state__text">Registrá los sistemas en la tabla hub_sistemas de Supabase.</p>
          </div>
        </div>
      ) : (
        <div className="table-container animate-fade-in">
          <div className="table-container__header">
            <h3 className="table-container__title">Catálogo de Sistemas</h3>
          </div>
          <table>
            <thead>
              <tr>
                <th>Sistema</th>
                <th>Identificador</th>
                <th>URL</th>
                <th>Estado</th>
                <th>Registrado</th>
              </tr>
            </thead>
            <tbody>
              {systems.map((s) => {
                const IconComp = ICON_MAP[s.icono || ''] || MonitorSmartphone;
                return (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: 'var(--radius-sm)',
                            background: s.color || 'var(--color-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            flexShrink: 0,
                          }}
                        >
                          <IconComp size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{s.display_name}</div>
                          {s.descripcion && (
                            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                              {s.descripcion}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <code style={{
                        fontSize: '12px',
                        background: 'var(--sa-slate-100)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--sa-slate-700)',
                      }}>
                        {s.nombre}
                      </code>
                    </td>
                    <td>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '13px',
                          color: 'var(--color-primary)',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <ExternalLink size={12} />
                        {new URL(s.url).hostname}
                      </a>
                    </td>
                    <td>
                      {s.activo ? (
                        <span className="badge badge--green">
                          <CheckCircle size={10} /> Activo
                        </span>
                      ) : (
                        <span className="badge badge--red">
                          <XCircle size={10} /> Inactivo
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                      {new Date(s.created_at).toLocaleDateString('es-AR')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
