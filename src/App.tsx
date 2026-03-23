import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import MonitorPage from './pages/MonitorPage';
import PortfolioPage from './pages/PortfolioPage';
import DocumentationPage from './pages/DocumentationPage';
import {
  LayoutGrid, UserCog, Eye, Briefcase, LogOut,
  LogIn, Menu, X, BookOpen, Shield,
} from 'lucide-react';
import { initScreenshotGuard, updateScreenshotGuardUser, destroyScreenshotGuard } from './lib/screenshotGuard';
import './index.css';

function Navbar() {
  const { session, profile, isGlobalAdmin, isTyS, isRRHH, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutGrid, always: true },
    { to: '/admin', label: 'Administración', icon: UserCog, show: isGlobalAdmin || isRRHH },
    { to: '/monitor', label: 'Monitor', icon: Eye, show: isTyS },
    { to: '/portfolio', label: 'Portfolio', icon: Briefcase, show: isTyS || isRRHH },
    { to: '/docs', label: 'Documentación', icon: BookOpen, show: isTyS || isRRHH },
  ].filter(item => item.always || item.show);

  // Role badge
  const roleName = profile?.hub_roles?.display_name || profile?.cargo || 'Usuario';
  const roleColor = isGlobalAdmin ? 'purple' : isTyS ? 'blue' : isRRHH ? 'blue' : 'green';

  return (
    <>
      <header className="navbar-wrapper">
        <div className="navbar glass-panel">
          {/* Logo */}
          <Link to="/" className="navbar__brand" onClick={closeMobileMenu}>
            <img
              src="/logosanatorio.png"
              alt="Sanatorio Argentino"
              className="navbar__logo-img"
            />
            <span className="navbar__brand-text">Inicio</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="navbar__nav">
            {session && navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `navbar__link ${isActive ? 'navbar__link--active' : ''}`
                }
                end={to === '/'}
              >
                <Icon size={16} />
                <span className="navbar__link-text">{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Right side */}
          <div className="navbar__actions">
            {session ? (
              <>
                {/* Role Badge — desktop only */}
                <div className={`navbar__role-badge navbar__role-badge--${roleColor}`}>
                  <Shield size={12} />
                  <span>{roleName}</span>
                </div>

                <button onClick={logout} className="navbar__logout" title="Cerrar sesión">
                  <LogOut size={16} />
                  <span className="navbar__link-text">Salir</span>
                </button>
              </>
            ) : (
              <Link to="/login" className="navbar__login-btn">
                <LogIn size={16} />
                <span className="navbar__link-text">Ingresar</span>
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          {session && (
            <button
              className="navbar__mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menú"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && session && (
          <div className="navbar__mobile-menu glass-panel">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `navbar__mobile-link ${isActive ? 'navbar__mobile-link--active' : ''}`
                }
                onClick={closeMobileMenu}
                end={to === '/'}
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
            <div className="navbar__mobile-divider" />
            <div className={`navbar__mobile-role-badge navbar__role-badge--${roleColor}`}>
              <Shield size={12} />
              {roleName}
            </div>
            <button onClick={() => { closeMobileMenu(); logout(); }} className="navbar__mobile-logout">
              <LogOut size={16} />
              Cerrar Sesión
            </button>
          </div>
        )}
      </header>
    </>
  );
}

function AppLayout() {
  const { session, loading, isGlobalAdmin, isTyS, isRRHH } = useAuth();

  // Screenshot Guard — se activa al autenticarse
  useEffect(() => {
    if (session?.user?.id) {
      initScreenshotGuard(session.user.id);
      updateScreenshotGuardUser(session.user.id);
    }
    return () => destroyScreenshotGuard();
  }, [session?.user?.id]);

  if (loading) {
    return (
      <div className="loading-screen">
        <img
          src="/logosanatorio.png"
          alt="Sanatorio Argentino"
          className="loading-screen__logo"
        />
        <p className="loading-screen__text">Cargando Hub...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          {(isGlobalAdmin || isRRHH) && (
            <Route path="/admin" element={<AdminPage />} />
          )}
          {isTyS && (
            <Route path="/monitor" element={<MonitorPage />} />
          )}
          {(isTyS || isRRHH) && (
            <Route path="/portfolio" element={<PortfolioPage />} />
          )}
          {(isTyS || isRRHH) && (
            <Route path="/docs" element={<DocumentationPage />} />
          )}
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}
