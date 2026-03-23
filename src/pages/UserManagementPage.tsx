import { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, Shield, Loader2, Save, UserPlus,
  AlertCircle, CheckCircle, X, ChevronDown,
  Power, PowerOff, KeyRound, Eye, EyeOff, Lock,
  Monitor as MonitorIcon, ExternalLink, Pencil,
} from 'lucide-react';
import {
  fetchManagedSystems, fetchSystemUsers, fetchSystemRoles,
  toggleSystemUser, createAdmQuiUser, createEnfermeriaUser,
  updateSystemUser,
  type SystemInfo, type SystemUser, type SystemRole,
} from '../services/userManagementService';

// ─── Toast helper ──────────────
function Toast({ toast }: { toast: { type: 'success' | 'error'; message: string } | null }) {
  if (!toast) return null;
  return (
    <div style={{
      position: 'fixed', top: '90px', right: '24px', zIndex: 10000,
      padding: '14px 24px', borderRadius: '14px',
      background: toast.type === 'success'
        ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)'
        : 'linear-gradient(135deg, #fef2f2, #fecaca)',
      color: toast.type === 'success' ? '#065f46' : '#991b1b',
      border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
      display: 'flex', alignItems: 'center', gap: '10px',
      fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-display)',
      boxShadow: '0 20px 40px rgba(0,0,0,0.1)', animation: 'fadeIn 0.3s ease both',
    }}>
      {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
      {toast.message}
    </div>
  );
}

// ─── System Card ──────────────
function SystemCard({ sys, selected, onClick }: {
  sys: SystemInfo; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '16px 20px', borderRadius: '14px', cursor: 'pointer',
        background: selected
          ? `linear-gradient(135deg, ${sys.color}12, ${sys.color}06)`
          : 'white',
        border: selected ? `2px solid ${sys.color}60` : '2px solid var(--sa-slate-100)',
        display: 'flex', alignItems: 'center', gap: '14px',
        transition: 'all 0.25s ease', textAlign: 'left', width: '100%',
        boxShadow: selected ? `0 4px 16px ${sys.color}18` : 'none',
      }}
    >
      <div style={{
        width: '40px', height: '40px', borderRadius: '12px',
        background: `linear-gradient(135deg, ${sys.color}, ${sys.color}cc)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', flexShrink: 0,
        boxShadow: `0 4px 12px ${sys.color}40`,
      }}>
        <MonitorIcon size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-display)',
          color: 'var(--sa-slate-900)',
        }}>{sys.display_name}</div>
        <div style={{
          fontSize: '11px', color: 'var(--sa-slate-400)',
          display: 'flex', alignItems: 'center', gap: '4px',
        }}>
          {sys.isReadOnly && <Lock size={10} />}
          {sys.isReadOnly ? 'Solo lectura' : 'Gestión completa'}
        </div>
      </div>
      {selected && (
        <div style={{ color: sys.color }}>
          <ChevronDown size={16} />
        </div>
      )}
    </button>
  );
}

// ─── Create User Modal ──────────────
function CreateUserModal({ system, roles, onClose, onCreated }: {
  system: SystemInfo;
  roles: SystemRole[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    usuario: '', nombre: '', apellido: '', email: '', password: '',
    iniciales: '', rol: roles.find(r => r.es_default)?.nombre || '',
  });
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    setSaving(true);
    try {
      if (system.nombre === 'adm-qui') {
        if (!form.usuario || !form.nombre || !form.password) {
          setError('Usuario, nombre y contraseña son obligatorios');
          setSaving(false);
          return;
        }
        await createAdmQuiUser(form.usuario, form.nombre, form.password, form.iniciales || undefined);
      } else if (system.nombre === 'enfermeria') {
        if (!form.nombre || !form.apellido || !form.email || !form.password) {
          setError('Nombre, apellido, email y contraseña son obligatorios');
          setSaving(false);
          return;
        }
        await createEnfermeriaUser(form.nombre, form.apellido, form.email, form.password, form.rol);
      }
      onCreated();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Error creando usuario');
    }
    setSaving(false);
  };

  const inputStyle = {
    width: '100%', height: '44px', borderRadius: '12px',
    border: '2px solid var(--sa-slate-200)', background: 'white',
    padding: '0 16px', fontSize: '14px', fontFamily: 'var(--font-display)',
    outline: 'none', transition: 'border-color 0.2s',
  };

  const labelStyle = {
    display: 'block' as const, fontSize: '12px', fontWeight: 700,
    color: 'var(--sa-slate-500)', marginBottom: '6px',
    fontFamily: 'var(--font-display)', textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.25s ease both',
    }} onClick={onClose}>
      <div
        style={{
          background: 'white', borderRadius: '20px', padding: '32px',
          width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
          animation: 'fadeIn 0.3s ease both',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '14px',
            background: `linear-gradient(135deg, ${system.color}, ${system.color}cc)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
          }}>
            <UserPlus size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
              Nuevo Usuario
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--sa-slate-500)' }}>
              {system.display_name}
            </p>
          </div>
          <button onClick={onClose} style={{
            marginLeft: 'auto', background: 'var(--sa-slate-100)', border: 'none',
            borderRadius: '10px', width: '36px', height: '36px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={16} />
          </button>
        </div>

        {error && (
          <div style={{
            padding: '12px 16px', borderRadius: '12px', marginBottom: '16px',
            background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b',
            fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {system.nombre === 'adm-qui' && (
            <>
              <div>
                <label style={labelStyle}>Usuario</label>
                <input
                  style={inputStyle}
                  value={form.usuario}
                  onChange={e => setForm(f => ({ ...f, usuario: e.target.value }))}
                  placeholder="ej: lmarinero"
                />
              </div>
              <div>
                <label style={labelStyle}>Nombre Completo</label>
                <input
                  style={inputStyle}
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="ej: Leonardo Marinero"
                />
              </div>
              <div>
                <label style={labelStyle}>Iniciales</label>
                <input
                  style={inputStyle}
                  value={form.iniciales}
                  onChange={e => setForm(f => ({ ...f, iniciales: e.target.value }))}
                  placeholder="ej: LM (opcional)"
                />
              </div>
            </>
          )}

          {system.nombre === 'enfermeria' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Nombre</label>
                  <input
                    style={inputStyle}
                    value={form.nombre}
                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                    placeholder="María"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Apellido</label>
                  <input
                    style={inputStyle}
                    value={form.apellido}
                    onChange={e => setForm(f => ({ ...f, apellido: e.target.value }))}
                    placeholder="González"
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Email / Usuario</label>
                <input
                  style={inputStyle}
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="mgonzalez"
                />
              </div>
              <div>
                <label style={labelStyle}>Rol</label>
                <select
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  value={form.rol}
                  onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.nombre}>{r.display_name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label style={labelStyle}>Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...inputStyle, paddingRight: '48px' }}
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Contraseña inicial"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--sa-slate-400)', padding: '4px',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          style={{
            marginTop: '24px', width: '100%', height: '48px', borderRadius: '12px',
            border: 'none', cursor: saving ? 'wait' : 'pointer',
            background: `linear-gradient(135deg, ${system.color}, ${system.color}cc)`,
            color: 'white', fontWeight: 700, fontSize: '14px', fontFamily: 'var(--font-display)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            boxShadow: `0 6px 20px ${system.color}40`, opacity: saving ? 0.7 : 1,
            transition: 'all 0.2s',
          }}
        >
          {saving ? <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> : <UserPlus size={18} />}
          Crear Usuario
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────
export default function UserManagementPage() {
  const [systems, setSystems] = useState<SystemInfo[]>([]);
  const [selectedSystem, setSelectedSystem] = useState<SystemInfo | null>(null);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [roles, setRoles] = useState<SystemRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchManagedSystems();
        setSystems(data);
      } catch (e: any) {
        showToast('error', 'Error cargando sistemas');
      }
      setLoading(false);
    })();
  }, []);

  const loadSystemUsers = useCallback(async (sys: SystemInfo) => {
    setLoadingUsers(true);
    try {
      const [usersData, rolesData] = await Promise.all([
        fetchSystemUsers(sys.nombre),
        fetchSystemRoles(sys.nombre),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (e: any) {
      showToast('error', `Error: ${e.message}`);
    }
    setLoadingUsers(false);
  }, []);

  const handleSelectSystem = (sys: SystemInfo) => {
    if (selectedSystem?.id === sys.id) {
      setSelectedSystem(null);
      setUsers([]);
      setRoles([]);
      return;
    }
    setSelectedSystem(sys);
    setSearchTerm('');
    loadSystemUsers(sys);
  };

  const handleToggle = async (user: SystemUser) => {
    if (!selectedSystem) return;
    setToggling(user.user_id);
    try {
      await toggleSystemUser(user.user_id, selectedSystem.nombre, !user.activo);
      showToast('success', user.activo ? 'Acceso deshabilitado' : 'Acceso habilitado ✓');
      await loadSystemUsers(selectedSystem);
    } catch (e: any) {
      showToast('error', e.message);
    }
    setToggling(null);
  };

  const filteredUsers = users.filter(u => {
    const term = searchTerm.toLowerCase();
    const displayName = u.display_name || u.username || 'Usuario';
    return (
      displayName.toLowerCase().includes(term) ||
      (u.username || '').toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term)
    );
  });

  const activeCount = users.filter(u => u.activo).length;

  return (
    <div className="page">
      <Toast toast={toast} />

      {/* Header */}
      <div className="page__header" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', boxShadow: '0 8px 24px rgba(124,58,237,0.35)',
          }}>
            <Shield size={26} />
          </div>
          <div>
            <h1 className="page__title" style={{ fontSize: '1.6rem' }}>
              Gestión de Usuarios por Sistema
            </h1>
            <p className="page__subtitle" style={{ marginTop: '2px' }}>
              Crear, editar y controlar acceso de usuarios en cada subsistema
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <Loader2 size={36} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--sa-primary)' }} />
        </div>
      ) : (
        <>
          {/* System selector */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '10px', marginBottom: '28px',
          }}>
            {systems.map(sys => (
              <SystemCard
                key={sys.id}
                sys={sys}
                selected={selectedSystem?.id === sys.id}
                onClick={() => handleSelectSystem(sys)}
              />
            ))}
          </div>

          {/* Selected system panel */}
          {selectedSystem && (
            <div style={{
              borderRadius: '20px',
              border: `2px solid ${selectedSystem.color}20`,
              background: 'white',
              overflow: 'hidden',
              animation: 'fadeIn 0.3s ease both',
              boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
            }}>
              {/* System header bar */}
              <div style={{
                padding: '20px 28px',
                background: `linear-gradient(135deg, ${selectedSystem.color}08, ${selectedSystem.color}03)`,
                borderBottom: `1px solid ${selectedSystem.color}15`,
                display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
              }}>
                <div>
                  <h3 style={{
                    margin: 0, fontSize: '16px', fontWeight: 800,
                    fontFamily: 'var(--font-display)', color: 'var(--sa-slate-900)',
                  }}>
                    {selectedSystem.display_name}
                  </h3>
                  <div style={{
                    fontSize: '12px', color: 'var(--sa-slate-500)', marginTop: '2px',
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    <Users size={12} />
                    {activeCount} activos / {users.length} total
                    {selectedSystem.isReadOnly && (
                      <span style={{
                        marginLeft: '8px', fontSize: '10px', fontWeight: 700,
                        color: '#92400e', background: 'rgba(245,158,11,0.1)',
                        padding: '2px 8px', borderRadius: '6px',
                      }}>SOLO LECTURA</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
                  {selectedSystem.canCreate && (
                    <button
                      onClick={() => setShowCreateModal(true)}
                      style={{
                        height: '40px', padding: '0 20px', borderRadius: '12px',
                        border: 'none', cursor: 'pointer',
                        background: `linear-gradient(135deg, ${selectedSystem.color}, ${selectedSystem.color}cc)`,
                        color: 'white', fontWeight: 700, fontSize: '13px',
                        fontFamily: 'var(--font-display)', display: 'flex',
                        alignItems: 'center', gap: '8px',
                        boxShadow: `0 4px 12px ${selectedSystem.color}30`,
                      }}
                    >
                      <UserPlus size={16} /> Nuevo Usuario
                    </button>
                  )}
                  <a
                    href={selectedSystem.url}
                    target="_blank"
                    rel="noopener"
                    style={{
                      height: '40px', padding: '0 16px', borderRadius: '12px',
                      border: '2px solid var(--sa-slate-200)', background: 'white',
                      color: 'var(--sa-slate-600)', fontWeight: 600, fontSize: '13px',
                      fontFamily: 'var(--font-display)', display: 'flex',
                      alignItems: 'center', gap: '6px', textDecoration: 'none',
                    }}
                  >
                    <ExternalLink size={14} /> Abrir Sistema
                  </a>
                </div>
              </div>

              {/* Search */}
              <div style={{ padding: '16px 28px 0' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{
                    position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--sa-slate-400)', pointerEvents: 'none',
                  }} />
                  <input
                    type="text"
                    placeholder="Buscar usuario..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%', height: '42px', borderRadius: '12px',
                      border: '2px solid var(--sa-slate-100)', background: 'var(--sa-slate-50)',
                      paddingLeft: '44px', fontSize: '13px', fontFamily: 'var(--font-display)',
                      outline: 'none', transition: 'border-color 0.2s',
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = selectedSystem.color}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--sa-slate-100)'}
                  />
                </div>
              </div>

              {/* Users table */}
              <div style={{ padding: '16px 28px 28px' }}>
                {loadingUsers ? (
                  <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <Loader2 size={28} style={{ animation: 'spin 0.8s linear infinite', color: selectedSystem.color }} />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div style={{
                    textAlign: 'center', padding: '60px 0', color: 'var(--sa-slate-400)',
                    fontSize: '14px', fontFamily: 'var(--font-display)',
                  }}>
                    {searchTerm ? 'Sin resultados' : 'No hay usuarios registrados'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {filteredUsers.map((user, i) => {
                      const isToggling = toggling === user.user_id;
                      return (
                        <div
                          key={user.user_id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '14px',
                            padding: '14px 18px', borderRadius: '12px',
                            background: user.activo ? 'white' : 'var(--sa-slate-50)',
                            border: '1px solid var(--sa-slate-100)',
                            opacity: user.activo ? 1 : 0.6,
                            transition: 'all 0.2s',
                            animation: `fadeIn 0.2s ease ${i * 0.03}s both`,
                          }}
                        >
                          {/* Avatar */}
                          <div style={{
                            width: '40px', height: '40px', borderRadius: '12px',
                            background: user.activo
                              ? `linear-gradient(135deg, ${selectedSystem.color}, ${selectedSystem.color}cc)`
                              : 'var(--sa-slate-300)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontSize: '13px', fontWeight: 800,
                            fontFamily: 'var(--font-display)', flexShrink: 0,
                          }}>
                            {(user.display_name || user.username || 'U').split(/[\s@]/).filter(Boolean).map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                          </div>

                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-display)',
                                color: user.activo ? 'var(--sa-slate-900)' : 'var(--sa-slate-500)',
                              }}>
                                {user.display_name || user.username || 'Usuario Sin Nombre'}
                              </span>
                              <span style={{
                                fontSize: '10px', fontWeight: 700,
                                color: selectedSystem.color,
                                background: `${selectedSystem.color}10`,
                                padding: '2px 8px', borderRadius: '6px',
                              }}>
                                {user.rol}
                              </span>
                              {!user.activo && (
                                <span style={{
                                  fontSize: '10px', fontWeight: 700, color: '#991b1b',
                                  background: '#fef2f2', padding: '2px 8px', borderRadius: '6px',
                                }}>INACTIVO</span>
                              )}
                            </div>
                            <div style={{
                              fontSize: '12px', color: 'var(--sa-slate-400)', marginTop: '2px',
                            }}>
                              {user.username}
                              {user.email && user.email !== user.username && ` · ${user.email}`}
                            </div>
                          </div>

                          {/* Last login */}
                          <div style={{
                            fontSize: '11px', color: 'var(--sa-slate-400)', textAlign: 'right', flexShrink: 0,
                          }}>
                            {user.ultimo_login ? (
                              <>
                                <div style={{ fontWeight: 600 }}>Último acceso</div>
                                <div>{new Date(user.ultimo_login).toLocaleDateString('es-AR')}</div>
                              </>
                            ) : (
                              <span style={{ fontStyle: 'italic', color: 'var(--sa-slate-300)' }}>—</span>
                            )}
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                            {(selectedSystem.canToggle || selectedSystem.isReadOnly) && (
                              <button
                                onClick={() => handleToggle(user)}
                                disabled={isToggling}
                                title={user.activo ? 'Deshabilitar acceso' : 'Habilitar acceso'}
                                style={{
                                  width: '36px', height: '36px', borderRadius: '10px',
                                  border: 'none', cursor: isToggling ? 'wait' : 'pointer',
                                  background: user.activo
                                    ? 'rgba(239,68,68,0.08)'
                                    : 'rgba(16,185,129,0.08)',
                                  color: user.activo ? '#dc2626' : '#059669',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  transition: 'all 0.2s',
                                }}
                              >
                                {isToggling ? (
                                  <Loader2 size={14} style={{ animation: 'spin 0.6s linear infinite' }} />
                                ) : user.activo ? (
                                  <PowerOff size={14} />
                                ) : (
                                  <Power size={14} />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Create modal */}
      {showCreateModal && selectedSystem && (
        <CreateUserModal
          system={selectedSystem}
          roles={roles}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            showToast('success', 'Usuario creado ✓');
            loadSystemUsers(selectedSystem);
          }}
        />
      )}
    </div>
  );
}
