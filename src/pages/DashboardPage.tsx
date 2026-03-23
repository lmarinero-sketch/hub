import { useAuth } from '../contexts/AuthContext';
import { logSessionEvent } from '../services/auditService';
import {
  ExternalLink, ArrowRight, Activity, ShieldCheck,
  BarChart3, Users, ClipboardList, Stethoscope,
  MonitorSmartphone, Phone, FileText, Building2,
} from 'lucide-react';

// Map icon names to components
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
};

export default function DashboardPage() {
  const { profile, systems, session, geoPosition } = useAuth();

  const handleAccessSystem = async (sistemaId: string, url: string) => {
    if (!session?.user?.id) return;

    // Log system access
    await logSessionEvent(session.user.id, 'access_system', {
      sistemaId,
      geo: geoPosition || undefined,
    });

    // Open in new tab
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">
          {greeting()}, {profile?.display_name || 'Usuario'} 👋
        </h1>
        <p className="page__subtitle">
          Accedé a tus sistemas autorizados desde aquí.
        </p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card animate-fade-in" style={{ animationDelay: '0.05s' }}>
          <div className="stat-card__icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--sa-blue-600)' }}>
            <MonitorSmartphone size={24} />
          </div>
          <div>
            <div className="stat-card__value">{systems.length}</div>
            <div className="stat-card__label">Sistemas Habilitados</div>
          </div>
        </div>
        <div className="stat-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="stat-card__icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--sa-green-600)' }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="stat-card__value" style={{ color: 'var(--sa-green-600)' }}>Activa</div>
            <div className="stat-card__label">Sesión Verificada</div>
          </div>
        </div>
        <div className="stat-card animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <div className="stat-card__icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#7c3aed' }}>
            <Activity size={24} />
          </div>
          <div>
            <div className="stat-card__value" style={{ fontSize: '16px', color: '#7c3aed' }}>
              {profile?.sector || 'Sin sector'}
            </div>
            <div className="stat-card__label">Sector Asignado</div>
          </div>
        </div>
      </div>

      {/* System Cards Grid */}
      {systems.length === 0 ? (
        <div className="card animate-fade-in">
          <div className="empty-state">
            <ExternalLink size={48} className="empty-state__icon" />
            <h3 className="empty-state__title">Sin sistemas asignados</h3>
            <p className="empty-state__text">
              Contactá a RRHH para que te habiliten el acceso a los sistemas que necesitás.
            </p>
          </div>
        </div>
      ) : (
        <div className="system-grid">
          {systems.map(({ sistema, rol }, index) => {
            const IconComponent = ICON_MAP[sistema.icono || ''] || MonitorSmartphone;

            return (
              <div
                key={sistema.id}
                className="system-card animate-fade-in"
                style={{
                  '--card-accent': sistema.color,
                  animationDelay: `${0.05 * (index + 1)}s`,
                } as React.CSSProperties}
                onClick={() => handleAccessSystem(sistema.id, sistema.url)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleAccessSystem(sistema.id, sistema.url);
                  }
                }}
              >
                <div className="system-card__content">
                  <div className="system-card__icon" style={{ background: sistema.color }}>
                    <IconComponent size={28} />
                  </div>
                  <div>
                    <h3 className="system-card__name">{sistema.display_name}</h3>
                    {sistema.descripcion && (
                      <p className="system-card__description">{sistema.descripcion}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="badge badge--blue">{rol.display_name}</span>
                    <div className="system-card__action">
                      Acceder <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
