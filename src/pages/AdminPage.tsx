import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Users, Search, Check, X, Shield, Mail,
  ChevronDown, ChevronUp, Loader2, Save,
  UserPlus, AlertCircle, CheckCircle, Building2,
  Briefcase, Crown, ExternalLink,
} from 'lucide-react';

interface HubUser {
  user_id: string;
  email: string;
  auth_created_at: string;
  last_sign_in_at: string | null;
  display_name: string | null;
  sector: string | null;
  cargo: string | null;
  activo: boolean;
  rol_global_id: string | null;
  rol_nombre: string | null;
  rol_display: string | null;
}

interface SystemAssignment {
  sistema_id: string;
  sistema_nombre: string;
  sistema_display: string;
  sistema_color: string;
  sistema_url: string;
  assigned: boolean;
  rol_id: string | null;
  rol_nombre: string | null;
}

interface Role {
  id: string;
  nombre: string;
  display_name: string;
  nivel_acceso: number;
}

export default function AdminPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<HubUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<HubUser | null>(null);
  const [userSystems, setUserSystems] = useState<SystemAssignment[]>([]);
  const [loadingSystems, setLoadingSystems] = useState(false);
  const [savingSystem, setSavingSystem] = useState<string | null>(null);
  const [editProfile, setEditProfile] = useState({
    display_name: '',
    sector: '',
    cargo: '',
    rol_global_id: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('hub_list_users');
    if (error) {
      console.error('Error fetching users:', error);
      showToast('error', 'Error cargando usuarios');
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  }, []);

  const fetchRoles = useCallback(async () => {
    const { data } = await supabase
      .from('hub_roles')
      .select('*')
      .order('nivel_acceso', { ascending: false });
    setRoles(data || []);
  }, []);

  const fetchUserSystems = useCallback(async (userId: string) => {
    setLoadingSystems(true);
    const { data, error } = await supabase.rpc('hub_get_user_systems', {
      target_user_id: userId,
    });
    if (error) {
      console.error('Error fetching system assignments:', error);
    } else {
      setUserSystems(data || []);
    }
    setLoadingSystems(false);
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  const handleSelectUser = (user: HubUser) => {
    if (selectedUser?.user_id === user.user_id) {
      setSelectedUser(null);
      setUserSystems([]);
      return;
    }
    setSelectedUser(user);
    setEditProfile({
      display_name: user.display_name || '',
      sector: user.sector || '',
      cargo: user.cargo || '',
      rol_global_id: user.rol_global_id || '',
    });
    fetchUserSystems(user.user_id);
  };

  const handleToggleSystem = async (sistemaId: string, currentlyAssigned: boolean) => {
    if (!selectedUser) return;
    setSavingSystem(sistemaId);

    const { error } = await supabase.rpc('hub_toggle_system', {
      p_target_user_id: selectedUser.user_id,
      p_sistema_id: sistemaId,
      p_assign: !currentlyAssigned,
    });

    if (error) {
      showToast('error', `Error: ${error.message}`);
    } else {
      showToast('success', !currentlyAssigned ? 'Sistema asignado ✓' : 'Sistema removido');
      await fetchUserSystems(selectedUser.user_id);
      await fetchUsers();
    }
    setSavingSystem(null);
  };

  const handleSaveProfile = async () => {
    if (!selectedUser) return;
    setSavingProfile(true);

    const { error } = await supabase.rpc('hub_upsert_profile', {
      p_target_user_id: selectedUser.user_id,
      p_display_name: editProfile.display_name || null,
      p_sector: editProfile.sector || null,
      p_cargo: editProfile.cargo || null,
      p_rol_global_id: editProfile.rol_global_id || null,
    });

    if (error) {
      showToast('error', `Error guardando: ${error.message}`);
    } else {
      showToast('success', 'Perfil actualizado ✓');
      await fetchUsers();
      const updatedUser = users.find(u => u.user_id === selectedUser.user_id);
      if (updatedUser) {
        const rolInfo = roles.find(r => r.id === editProfile.rol_global_id);
        setSelectedUser({
          ...updatedUser,
          display_name: editProfile.display_name,
          sector: editProfile.sector,
          cargo: editProfile.cargo,
          rol_global_id: editProfile.rol_global_id,
          rol_display: rolInfo?.display_name || null,
          rol_nombre: rolInfo?.nombre || null,
        });
      }
    }
    setSavingProfile(false);
  };

  const filteredUsers = users.filter(u => {
    const term = searchTerm.toLowerCase();
    return (
      u.email.toLowerCase().includes(term) ||
      (u.display_name || '').toLowerCase().includes(term) ||
      (u.sector || '').toLowerCase().includes(term)
    );
  });

  const getRoleBadge = (nombre: string | null): { className: string; icon: React.ReactNode } => {
    switch (nombre) {
      case 'admin_global': return { className: 'badge--purple', icon: <Crown size={10} /> };
      case 'tys': return { className: 'badge--blue', icon: <Shield size={10} /> };
      case 'rrhh': return { className: 'badge--blue', icon: <Briefcase size={10} /> };
      case 'directivo': return { className: 'badge--amber', icon: <Building2 size={10} /> };
      case 'responsable': return { className: 'badge--green', icon: <Check size={10} /> };
      default: return { className: 'badge--slate', icon: null };
    }
  };

  const assignedCount = users.filter(u => u.rol_global_id).length;

  return (
    <div className="page">
      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '90px',
          right: '24px',
          zIndex: 10000,
          padding: '14px 24px',
          borderRadius: '14px',
          background: toast.type === 'success'
            ? 'linear-gradient(135deg, #ecfdf5, #d1fae5)'
            : 'linear-gradient(135deg, #fef2f2, #fecaca)',
          color: toast.type === 'success' ? '#065f46' : '#991b1b',
          border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          fontWeight: 700,
          fontFamily: 'var(--font-display)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1), 0 8px 16px rgba(0,0,0,0.05)',
          animation: 'fadeIn 0.3s ease both',
          backdropFilter: 'blur(12px)',
        }}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="page__header" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, var(--sa-primary), #0284c7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 8px 24px rgba(0, 84, 139, 0.35)',
          }}>
            <Users size={26} />
          </div>
          <div>
            <h1 className="page__title" style={{ fontSize: '1.6rem' }}>Gestión de Accesos</h1>
            <p className="page__subtitle" style={{ marginTop: '2px' }}>
              Panel de administración — usuarios y permisos del ecosistema
            </p>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="stats-grid" style={{ marginBottom: '28px' }}>
        {[
          {
            icon: <Users size={22} />,
            value: users.length,
            label: 'Usuarios Registrados',
            bg: 'rgba(0, 84, 139, 0.08)',
            color: 'var(--sa-primary)',
          },
          {
            icon: <CheckCircle size={22} />,
            value: assignedCount,
            label: 'Con Perfil Asignado',
            bg: 'rgba(16, 185, 129, 0.08)',
            color: '#059669',
          },
          {
            icon: <AlertCircle size={22} />,
            value: users.length - assignedCount,
            label: 'Sin Rol Asignado',
            bg: 'rgba(245, 158, 11, 0.08)',
            color: '#b45309',
          },
        ].map((stat, i) => (
          <div key={i} className="stat-card animate-fade-in" style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="stat-card__icon" style={{ background: stat.bg, color: stat.color }}>
              {stat.icon}
            </div>
            <div>
              <div className="stat-card__value">{stat.value}</div>
              <div className="stat-card__label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search bar */}
      <div style={{
        position: 'relative',
        marginBottom: '24px',
      }}>
        <Search
          size={18}
          style={{
            position: 'absolute',
            left: '18px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--sa-slate-400)',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          placeholder="Buscar por email, nombre o sector..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-input"
          style={{
            paddingLeft: '48px',
            width: '100%',
            height: '48px',
            borderRadius: '14px',
            border: '2px solid var(--sa-slate-200)',
            background: 'white',
            fontSize: '14px',
            fontFamily: 'var(--font-display)',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--sa-primary)';
            e.currentTarget.style.boxShadow = '0 0 0 4px rgba(0,84,139,0.08)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--sa-slate-200)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            style={{
              position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
              background: 'var(--sa-slate-100)', border: 'none', borderRadius: '8px',
              width: '28px', height: '28px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', color: 'var(--sa-slate-500)',
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* User list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <Loader2 size={36} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--sa-primary)' }} />
          <p style={{ marginTop: '16px', fontSize: '14px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-display)' }}>
            Cargando usuarios...
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredUsers.map((user, index) => {
            const isSelected = selectedUser?.user_id === user.user_id;
            const isYou = user.user_id === profile?.user_id;
            const roleBadge = getRoleBadge(user.rol_nombre);

            return (
              <div key={user.user_id} style={{ animation: `fadeIn 0.3s ease ${index * 0.03}s both` }}>
                {/* User row */}
                <div
                  onClick={() => handleSelectUser(user)}
                  style={{
                    cursor: 'pointer',
                    borderRadius: isSelected ? '16px 16px 0 0' : '16px',
                    background: isSelected
                      ? 'linear-gradient(135deg, rgba(0,84,139,0.04), rgba(2,132,199,0.04))'
                      : 'white',
                    border: isSelected ? '2px solid rgba(0,84,139,0.15)' : '2px solid var(--sa-slate-100)',
                    borderBottom: isSelected ? '1px solid rgba(0,84,139,0.08)' : undefined,
                    transition: 'all 0.25s ease',
                    padding: '18px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    boxShadow: isSelected ? '0 4px 16px rgba(0,84,139,0.08)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'rgba(0,84,139,0.12)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'var(--sa-slate-100)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: user.rol_global_id
                      ? 'linear-gradient(135deg, var(--sa-primary), #0284c7)'
                      : 'linear-gradient(135deg, var(--sa-slate-200), var(--sa-slate-300))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '15px',
                    fontWeight: 800,
                    fontFamily: 'var(--font-display)',
                    flexShrink: 0,
                    boxShadow: user.rol_global_id
                      ? '0 4px 12px rgba(0,84,139,0.25)'
                      : '0 2px 6px rgba(0,0,0,0.08)',
                    letterSpacing: '0.02em',
                  }}>
                    {(user.display_name || user.email)
                      .split(/[@\s]/)
                      .filter(Boolean)
                      .map(w => w[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '15px',
                        fontWeight: 700,
                        fontFamily: 'var(--font-display)',
                        color: 'var(--sa-slate-900)',
                      }}>
                        {user.display_name || user.email.split('@')[0]}
                      </span>
                      {isYou && (
                        <span style={{
                          fontSize: '9px', fontWeight: 800, color: 'white',
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          padding: '2px 8px', borderRadius: '6px', letterSpacing: '0.05em',
                          fontFamily: 'var(--font-display)',
                        }}>TÚ</span>
                      )}
                      {user.rol_display ? (
                        <span className={`badge ${roleBadge.className}`} style={{
                          fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px',
                        }}>
                          {roleBadge.icon} {user.rol_display}
                        </span>
                      ) : (
                        <span style={{
                          fontSize: '10px', fontWeight: 700, color: '#92400e',
                          background: 'rgba(245,158,11,0.1)',
                          padding: '2px 8px', borderRadius: '6px',
                          fontFamily: 'var(--font-display)',
                        }}>Sin Rol</span>
                      )}
                    </div>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      fontSize: '12px', color: 'var(--sa-slate-500)', marginTop: '4px',
                    }}>
                      <Mail size={12} style={{ opacity: 0.6 }} />
                      <span>{user.email}</span>
                      {user.sector && (
                        <>
                          <span style={{ color: 'var(--sa-slate-300)' }}>·</span>
                          <span style={{ fontWeight: 600, color: 'var(--sa-primary)' }}>{user.sector}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Last login */}
                  <div style={{
                    fontSize: '11px', color: 'var(--sa-slate-400)',
                    textAlign: 'right', flexShrink: 0,
                  }}>
                    {user.last_sign_in_at ? (
                      <>
                        <div style={{ fontWeight: 600, color: 'var(--sa-slate-500)' }}>Último acceso</div>
                        <div>{new Date(user.last_sign_in_at).toLocaleDateString('es-AR')}</div>
                      </>
                    ) : (
                      <span style={{ color: 'var(--sa-slate-300)', fontStyle: 'italic' }}>Nunca ingresó</span>
                    )}
                  </div>

                  {/* Expand indicator */}
                  <div style={{
                    color: isSelected ? 'var(--sa-primary)' : 'var(--sa-slate-300)',
                    transition: 'color 0.2s, transform 0.2s',
                    transform: isSelected ? 'rotate(180deg)' : 'rotate(0)',
                  }}>
                    <ChevronDown size={20} />
                  </div>
                </div>

                {/* Expanded detail panel */}
                {isSelected && (
                  <div style={{
                    border: '2px solid rgba(0,84,139,0.15)',
                    borderTop: 'none',
                    borderRadius: '0 0 16px 16px',
                    background: 'linear-gradient(180deg, rgba(0,84,139,0.02), rgba(255,255,255,0.8))',
                    backdropFilter: 'blur(12px)',
                    padding: '28px 32px',
                    animation: 'fadeIn 0.25s ease both',
                  }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                      gap: '32px',
                    }}>
                      {/* LEFT: Profile editor */}
                      <div>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          marginBottom: '20px', paddingBottom: '12px',
                          borderBottom: '2px solid var(--sa-slate-100)',
                        }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '10px',
                            background: 'linear-gradient(135deg, var(--sa-primary), #0284c7)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', boxShadow: '0 4px 12px rgba(0,84,139,0.2)',
                          }}>
                            <UserPlus size={16} />
                          </div>
                          <h4 style={{
                            fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-display)',
                            color: 'var(--sa-slate-800)', margin: 0,
                          }}>
                            Perfil del Usuario
                          </h4>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          <div>
                            <label style={{
                              display: 'block', fontSize: '12px', fontWeight: 700,
                              color: 'var(--sa-slate-500)', marginBottom: '6px',
                              fontFamily: 'var(--font-display)', textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}>Nombre Completo</label>
                            <input
                              type="text"
                              className="form-input"
                              value={editProfile.display_name}
                              onChange={(e) => setEditProfile(p => ({ ...p, display_name: e.target.value }))}
                              placeholder="Nombre y Apellido"
                              style={{
                                width: '100%', height: '44px', borderRadius: '12px',
                                border: '2px solid var(--sa-slate-200)', background: 'white',
                                padding: '0 16px', fontSize: '14px', fontFamily: 'var(--font-display)',
                                transition: 'border-color 0.2s',
                                outline: 'none',
                              }}
                              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--sa-primary)'}
                              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--sa-slate-200)'}
                            />
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                              <label style={{
                                display: 'block', fontSize: '12px', fontWeight: 700,
                                color: 'var(--sa-slate-500)', marginBottom: '6px',
                                fontFamily: 'var(--font-display)', textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                              }}>Sector</label>
                              <input
                                type="text"
                                className="form-input"
                                value={editProfile.sector}
                                onChange={(e) => setEditProfile(p => ({ ...p, sector: e.target.value }))}
                                placeholder="Ej: Quirófano"
                                style={{
                                  width: '100%', height: '44px', borderRadius: '12px',
                                  border: '2px solid var(--sa-slate-200)', background: 'white',
                                  padding: '0 16px', fontSize: '14px', fontFamily: 'var(--font-display)',
                                  transition: 'border-color 0.2s', outline: 'none',
                                }}
                                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--sa-primary)'}
                                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--sa-slate-200)'}
                              />
                            </div>
                            <div>
                              <label style={{
                                display: 'block', fontSize: '12px', fontWeight: 700,
                                color: 'var(--sa-slate-500)', marginBottom: '6px',
                                fontFamily: 'var(--font-display)', textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                              }}>Cargo</label>
                              <input
                                type="text"
                                className="form-input"
                                value={editProfile.cargo}
                                onChange={(e) => setEditProfile(p => ({ ...p, cargo: e.target.value }))}
                                placeholder="Ej: Coordinador"
                                style={{
                                  width: '100%', height: '44px', borderRadius: '12px',
                                  border: '2px solid var(--sa-slate-200)', background: 'white',
                                  padding: '0 16px', fontSize: '14px', fontFamily: 'var(--font-display)',
                                  transition: 'border-color 0.2s', outline: 'none',
                                }}
                                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--sa-primary)'}
                                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--sa-slate-200)'}
                              />
                            </div>
                          </div>
                          <div>
                            <label style={{
                              display: 'block', fontSize: '12px', fontWeight: 700,
                              color: 'var(--sa-slate-500)', marginBottom: '6px',
                              fontFamily: 'var(--font-display)', textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}>Rol Global</label>
                            <select
                              className="form-input"
                              value={editProfile.rol_global_id}
                              onChange={(e) => setEditProfile(p => ({ ...p, rol_global_id: e.target.value }))}
                              style={{
                                width: '100%', height: '44px', borderRadius: '12px',
                                border: '2px solid var(--sa-slate-200)', background: 'white',
                                padding: '0 16px', fontSize: '14px', fontFamily: 'var(--font-display)',
                                transition: 'border-color 0.2s', outline: 'none',
                                cursor: 'pointer', appearance: 'auto',
                              }}
                              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--sa-primary)'}
                              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--sa-slate-200)'}
                            >
                              <option value="">— Sin rol asignado —</option>
                              {roles.map(r => (
                                <option key={r.id} value={r.id}>
                                  {r.display_name} (Nivel {r.nivel_acceso})
                                </option>
                              ))}
                            </select>
                          </div>

                          <button
                            onClick={handleSaveProfile}
                            disabled={savingProfile}
                            style={{
                              marginTop: '8px', height: '48px', borderRadius: '12px',
                              border: 'none', cursor: savingProfile ? 'wait' : 'pointer',
                              background: 'linear-gradient(135deg, var(--sa-primary), #0284c7)',
                              color: 'white', fontWeight: 700, fontSize: '14px',
                              fontFamily: 'var(--font-display)', display: 'flex',
                              alignItems: 'center', justifyContent: 'center', gap: '10px',
                              boxShadow: '0 6px 20px rgba(0,84,139,0.3)',
                              transition: 'all 0.2s',
                              opacity: savingProfile ? 0.7 : 1,
                              transform: 'translateY(0)',
                            }}
                            onMouseEnter={(e) => {
                              if (!savingProfile) {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,84,139,0.4)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,84,139,0.3)';
                            }}
                          >
                            {savingProfile ? (
                              <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
                            ) : (
                              <Save size={18} />
                            )}
                            Guardar Perfil
                          </button>
                        </div>
                      </div>

                      {/* RIGHT: System access checkboxes */}
                      <div>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          marginBottom: '20px', paddingBottom: '12px',
                          borderBottom: '2px solid var(--sa-slate-100)',
                        }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '10px',
                            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', boxShadow: '0 4px 12px rgba(124,58,237,0.25)',
                          }}>
                            <Shield size={16} />
                          </div>
                          <h4 style={{
                            fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-display)',
                            color: 'var(--sa-slate-800)', margin: 0,
                          }}>
                            Acceso a Sistemas
                          </h4>
                          <span style={{
                            marginLeft: 'auto', fontSize: '11px', fontWeight: 700,
                            color: '#059669', fontFamily: 'var(--font-display)',
                          }}>
                            {userSystems.filter(s => s.assigned).length}/{userSystems.length} activos
                          </span>
                        </div>

                        {loadingSystems ? (
                          <div style={{ textAlign: 'center', padding: '50px 0' }}>
                            <Loader2 size={28} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--sa-primary)' }} />
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {userSystems.map((sys) => {
                              const isSaving = savingSystem === sys.sistema_id;
                              return (
                                <div
                                  key={sys.sistema_id}
                                  onClick={() => !isSaving && handleToggleSystem(sys.sistema_id, sys.assigned)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '14px',
                                    padding: '14px 18px',
                                    borderRadius: '12px',
                                    background: sys.assigned
                                      ? `linear-gradient(135deg, ${sys.sistema_color}08, ${sys.sistema_color}04)`
                                      : 'var(--sa-slate-50)',
                                    border: `2px solid ${sys.assigned ? sys.sistema_color + '40' : 'transparent'}`,
                                    cursor: isSaving ? 'wait' : 'pointer',
                                    transition: 'all 0.2s ease',
                                    opacity: isSaving ? 0.6 : 1,
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isSaving) e.currentTarget.style.transform = 'translateX(4px)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateX(0)';
                                  }}
                                >
                                  {/* Checkbox */}
                                  <div style={{
                                    width: '26px', height: '26px', borderRadius: '8px',
                                    border: sys.assigned
                                      ? `2px solid ${sys.sistema_color}`
                                      : '2px solid var(--sa-slate-300)',
                                    background: sys.assigned ? sys.sistema_color : 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.2s', flexShrink: 0,
                                    boxShadow: sys.assigned ? `0 2px 8px ${sys.sistema_color}40` : 'none',
                                  }}>
                                    {isSaving ? (
                                      <Loader2 size={14} color="white" style={{ animation: 'spin 0.6s linear infinite' }} />
                                    ) : sys.assigned ? (
                                      <Check size={14} color="white" strokeWidth={3} />
                                    ) : null}
                                  </div>

                                  {/* Color dot */}
                                  <div style={{
                                    width: '10px', height: '10px', borderRadius: '50%',
                                    background: sys.sistema_color, flexShrink: 0,
                                    boxShadow: `0 0 0 3px ${sys.sistema_color}20`,
                                  }} />

                                  {/* System info */}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                      fontSize: '13px', fontWeight: 700,
                                      fontFamily: 'var(--font-display)',
                                      color: sys.assigned ? 'var(--sa-slate-900)' : 'var(--sa-slate-500)',
                                    }}>
                                      {sys.sistema_display}
                                    </div>
                                    <div style={{
                                      fontSize: '11px', color: 'var(--sa-slate-400)',
                                      display: 'flex', alignItems: 'center', gap: '4px',
                                    }}>
                                      <ExternalLink size={10} />
                                      {sys.sistema_url.replace('https://', '').replace(/\/$/, '')}
                                    </div>
                                  </div>

                                  {/* Status */}
                                  {sys.assigned && (
                                    <span style={{
                                      fontSize: '10px', fontWeight: 700, color: '#059669',
                                      background: 'rgba(16,185,129,0.1)',
                                      padding: '3px 10px', borderRadius: '8px',
                                      fontFamily: 'var(--font-display)', flexShrink: 0,
                                    }}>
                                      Habilitado
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredUsers.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '80px 20px',
              color: 'var(--color-text-secondary)',
            }}>
              <Search size={44} style={{ color: 'var(--sa-slate-200)', marginBottom: '16px' }} />
              <p style={{ fontWeight: 700, fontSize: '16px', fontFamily: 'var(--font-display)' }}>
                No se encontraron usuarios
              </p>
              <p style={{ fontSize: '13px', color: 'var(--sa-slate-400)' }}>
                Probá con otro término de búsqueda
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
