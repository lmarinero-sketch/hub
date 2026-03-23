import { useState } from 'react';
import {
  ClipboardList,
  Stethoscope,
  Activity,
  Phone,
  FileText,
  Building2,
  BarChart3,
  ExternalLink,
  Github,
  ChevronDown,
  ChevronUp,
  Code,
  Database,
  Shield,
  Layers,
  Server,
  Globe,
  BookOpen,
  Download,
  Users,
  MessageSquare,
  Workflow,
  Brain,
  Calendar,
  LayoutDashboard,
} from 'lucide-react';

interface SystemDoc {
  id: string;
  name: string;
  displayName: string;
  icon: React.ReactNode;
  color: string;
  repo: string;
  repoUrl: string;
  sinopsis: string;
  descripcionDetallada: string;
  funcionalidades: string[];
  stack: { label: string; items: string[] }[];
  tablasPrincipales: string[];
  roles: string[];
  estado: 'produccion' | 'desarrollo' | 'prototipo';
}

const SYSTEMS_DOCS: SystemDoc[] = [
  {
    id: 'calidad',
    name: 'calidad',
    displayName: 'Dora - Gestión de Calidad',
    icon: <ClipboardList size={28} />,
    color: '#2563eb',
    repo: 'lucasmmg12/calidad',
    repoUrl: 'https://github.com/lucasmmg12/calidad',
    sinopsis: 'Gestión integral del ciclo de mejora continua — hallazgos, acciones correctivas, análisis de causa raíz y validación institucional.',
    descripcionDetallada: `El Sistema de Calidad es la columna vertebral del ciclo de mejora continua del Sanatorio Argentino. Permite a cualquier colaborador reportar hallazgos, oportunidades de mejora, eventos adversos o cuasi eventos adversos de forma anónima o identificada.

Una vez reportado, el caso ingresa al "Management Circle" — un flujo institucional donde el equipo de Calidad analiza, categoriza (gravedad, origen, sector), y deriva al responsable correspondiente para su resolución. El responsable debe documentar la acción correctiva inmediata, el análisis de causa raíz (RCA) y el plan de acción con fecha límite.

El sistema incluye validación por parte de Calidad antes del cierre definitivo (quality_validation), notificaciones automáticas por WhatsApp a responsables y reportantes, alertas de vencimiento automatizadas (pg_cron a las 9:00 AM), y un ciclo iterativo de apelación/rechazo hasta que la solución sea satisfactoria.

Además cuenta con métricas avanzadas con IA (GPT-4o-mini para categorización y urgencia), chat bidireccional WhatsApp integrado con la identidad institucional "Dora", y un panel personalizado "Mis Casos" para cada responsable.`,
    funcionalidades: [
      'Formulario público de reporte (anónimo o identificado)',
      'Dashboard administrativo con filtros por estado, sector, prioridad',
      'Flujo de validación de Calidad (quality_validation) con aprobación/rechazo',
      'Análisis de Causa Raíz (RCA) con plan de acción y fecha límite',
      'Chat bidireccional WhatsApp integrado (identidad "Dora")',
      'Notificaciones automáticas por WhatsApp (resolución, rechazo, vencimiento)',
      'Alertas automatizadas de deadline (pg_cron + Edge Function)',
      'Métricas y analytics con categorización por IA',
      'Seguimiento público por código de caso',
      'Panel "Mis Casos" para responsables',
      'Gestión de usuarios y roles (Admin, Responsable, Directivo)',
      'Historial de actividad con timeline visual',
    ],
    stack: [
      { label: 'Frontend', items: ['React 19', 'Vite', 'TypeScript', 'Tailwind CSS 4'] },
      { label: 'Backend', items: ['Supabase (PostgreSQL)', 'Edge Functions', 'pg_cron'] },
      { label: 'IA', items: ['OpenAI GPT-4o-mini (categorización, urgencia)'] },
      { label: 'Mensajería', items: ['BuilderBot Cloud API (WhatsApp)'] },
      { label: 'Librerías', items: ['Lucide React', 'Chart.js', 'React Router DOM', 'Lodash'] },
    ],
    tablasPrincipales: ['reports', 'calidad_users', 'whatsapp_messages', 'notification_contacts'],
    roles: ['Admin (Calidad)', 'Responsable de Sector', 'Directivo'],
    estado: 'produccion',
  },
  {
    id: 'adm-qui',
    name: 'adm-qui',
    displayName: 'ADM-QUI (Quirófano)',
    icon: <Stethoscope size={28} />,
    color: '#7c3aed',
    repo: 'lucasmmg12/quirofano',
    repoUrl: 'https://github.com/lucasmmg12/quirofano',
    sinopsis: 'Sistema de admisión quirúrgica — gestión de internaciones, prácticas, presupuestos y coordinación operativa del quirófano.',
    descripcionDetallada: `ADM-QUI es el sistema centralizado de gestión quirúrgica del Sanatorio Argentino. Controla el flujo completo desde la programación de una cirugía hasta la liquidación de prácticas e internaciones.

El panel principal muestra la agenda quirúrgica con estados en tiempo real (programada, en curso, reprogramada, suspendida, finalizada). Cada cirugía tiene asociados datos del paciente (DNI, obra social), el equipo médico, y los items del presupuesto.

Los módulos de Internaciones y Prácticas comparten un componente "Carrito" unificado que permite agregar items con fechas independientes. El sistema genera templates de impresión optimizados para auditoría.

Incluye integración con WhatsApp para comunicación con pacientes y coordinación del equipo, y maneja la lógica de reprogramación preservando el historial completo de eventos.`,
    funcionalidades: [
      'Agenda quirúrgica con estados en tiempo real',
      'Módulo de Internaciones con carrito de items',
      'Módulo de Prácticas con presupuestos',
      'Gestión de pacientes (DNI, obra social, datos)',
      'Templates de impresión para auditoría',
      'Reprogramación de cirugías con trazabilidad',
      'Integración WhatsApp para coordinación',
      'Búsqueda de pacientes por hospital_pacientes',
      'Comentarios y eventos por cirugía',
      'Órdenes médicas digitales',
    ],
    stack: [
      { label: 'Frontend', items: ['React', 'Vite', 'JavaScript (JSX)'] },
      { label: 'Backend', items: ['Supabase (PostgreSQL)'] },
      { label: 'Mensajería', items: ['BuilderBot Cloud API (WhatsApp)'] },
      { label: 'Librerías', items: ['Lucide React', 'React Router DOM'] },
    ],
    tablasPrincipales: ['surgeries', 'surgery_events', 'surgery_comments', 'surgery_templates', 'medical_orders', 'presupuestos', 'hospital_pacientes'],
    roles: ['Admisionista', 'Instrumentadora', 'Coordinador Quirófano'],
    estado: 'produccion',
  },
  {
    id: 'enfermeria',
    name: 'enfermeria',
    displayName: 'Enfermería',
    icon: <Activity size={28} />,
    color: '#06b6d4',
    repo: 'lucasmmg12/enfermeria',
    repoUrl: 'https://github.com/lucasmmg12/enfermeria',
    sinopsis: 'Sistema integral de enfermería — fichadas de personal, gestión de internaciones, pases de guardia y registro de novedades.',
    descripcionDetallada: `El sistema de Enfermería digitaliza los procesos críticos del servicio: fichadas de personal (entrada/salida), gestión de internaciones activas, pases de guardia entre turnos, y registro de novedades clínicas.

Cada enfermero tiene su perfil con credenciales de acceso, sector asignado, y capacidad de registrar alertas clínicas y audios de pase de guardia. El sistema maneja internaciones con sus respectivos registros de evolución y notas.

Las fichadas se importan en lote y se procesan para generar totales mensuales automáticos, facilitando la liquidación. El módulo de calendario permite gestionar la agenda del servicio.`,
    funcionalidades: [
      'Fichadas de personal (entrada/salida)',
      'Gestión de internaciones activas',
      'Pases de guardia digitales (texto y audio)',
      'Registro de alertas clínicas',
      'Importación de fichadas en lote',
      'Totales mensuales automáticos',
      'Calendario del servicio',
      'Perfiles de enfermeros con sector',
    ],
    stack: [
      { label: 'Frontend', items: ['React', 'Vite'] },
      { label: 'Backend', items: ['Supabase (PostgreSQL)'] },
      { label: 'Librerías', items: ['Lucide React', 'React Router DOM'] },
    ],
    tablasPrincipales: ['enf_usuarios', 'enf_internaciones', 'enf_pases', 'enf_registros', 'enf_audios', 'enf_alertas'],
    roles: ['Enfermero/a', 'Jefe de Enfermería', 'Supervisor'],
    estado: 'produccion',
  },
  {
    id: 'contact-center',
    name: 'contact-center',
    displayName: 'Contact Center + Simón IA',
    icon: <Phone size={28} />,
    color: '#f59e0b',
    repo: 'lucasmmg12/contact-center',
    repoUrl: 'https://github.com/lucasmmg12/contact-center',
    sinopsis: 'Dashboard de inteligencia conversacional + Simón, el asistente IA documental con RAG Pipeline V3.2 — el prototipo que será usado en breve por todo el Sanatorio.',
    descripcionDetallada: `El Contact Center Analytics es la capa de inteligencia del Sanatorio Argentino para procesar, almacenar y analizar ~120 chats diarios (~30,000 mensajes/mes) provenientes de la plataforma AsisteClick (web + WhatsApp). Incluye análisis de sentimiento, scoring de agentes y mapa visual del árbol de decisiones del bot.

🧠 SIMÓN — Asistente IA Documental (RAG Pipeline V3.2)

Simón es el asistente de inteligencia artificial del Sanatorio Argentino, basado en un pipeline RAG (Retrieval-Augmented Generation) de 8 etapas diseñado para máxima precisión. Su propósito es convertirse en la base de conocimiento institucional, permitiendo a cualquier colaborador consultar documentos internos con lenguaje natural y recibir respuestas precisas con citación de fuentes.

El pipeline de Simón opera en la siguiente secuencia:
1. Desambiguación — Detecta preguntas vagas y solicita clarificación con sugerencias inteligentes.
2. HyDE (Hypothetical Document Embeddings) — Genera una respuesta hipotética para guiar la búsqueda semántica.
3. Multi-Query — Reformula la pregunta en 3 ángulos diferentes preservando entidades clave.
4. Hybrid Search — Ejecuta búsquedas semánticas + full-text en paralelo con ThreadPoolExecutor.
5. Deduplicación — Elimina fragmentos duplicados priorizando por score.
6. Entity-Aware Topic Filtering — Extrae entidades (obras sociales, servicios, sectores) y filtra resultados fuera de tema.
7. Re-ranking con LLM — Cada fragmento es evaluado en paralelo por GPT-4o-mini con entity-awareness (score 0-10).
8. Generación Final — GPT-4o responde usando exclusivamente el contexto filtrado, citando fuentes.

Post-proceso: Chat Learning — Simón indexa automáticamente cada Q&A exitoso como nuevo chunk de conocimiento, mejorando continuamente.

Además cuenta con un backend Python/FastAPI desplegado en Render con boot sequence inteligente (se apaga tras 15 min de inactividad y despierta en 30-60 seg), sistema de Reglas Manuales con prioridad sobre documentos, gestión de archivos con carpetas y tags, y un dashboard de analytics completo (SimonAnalytics) con métricas de uso, calidad de respuestas, pipeline performance, distribución horaria y preguntas frecuentes.

ESTADO: Prototipo avanzado integrado en Contact Center. Próximamente será desplegado como herramienta institucional para todo el Sanatorio Argentino.`,
    funcionalidades: [
      'Ingesta inteligente de webhooks AsisteClick',
      'Análisis de sentimiento e intención con IA (GPT-4o-mini)',
      'Scoring de agentes (tono, protocolo, velocidad)',
      'Visualización del árbol de decisiones del chatbot',
      'Dashboard con filtros por fecha, agente y canal',
      'Simón IA: Chat conversacional con RAG Pipeline V3.2 de 8 etapas',
      'Simón IA: Desambiguación inteligente con sugerencias contextuales',
      'Simón IA: HyDE + Multi-Query para búsqueda semántica avanzada',
      'Simón IA: Entity-Aware Topic Filtering (obras sociales, servicios, etc.)',
      'Simón IA: Re-ranking paralelo con LLM y entity-awareness',
      'Simón IA: Chat Learning — auto-indexa Q&A para mejora continua',
      'Simón IA: Sistema de Reglas Manuales con prioridad máxima',
      'Simón IA: Gestión de documentos (PDF, DOCX, XLSX, CSV, TXT, MD, JSON, XML)',
      'Simón IA: Analytics dashboard con métricas de uso y calidad',
      'Simón IA: Boot sequence inteligente (cold start en 30-60 seg)',
    ],
    stack: [
      { label: 'Frontend', items: ['React', 'Vite', 'Recharts', 'Lucide React'] },
      { label: 'Backend CC', items: ['Supabase Edge Functions', 'PostgreSQL'] },
      { label: 'Backend Simón', items: ['Python', 'FastAPI', 'Render (Deploy)'] },
      { label: 'IA', items: ['OpenAI GPT-4o (generación)', 'GPT-4o-mini (re-ranking, entities, disambiguation)'] },
      { label: 'RAG', items: ['Supabase pgvector (embeddings)', 'Hybrid Search (semántica + full-text)', 'HyDE', 'Chat Learning'] },
      { label: 'Fuente', items: ['AsisteClick (Webhooks)'] },
    ],
    tablasPrincipales: ['chat_conversations', 'chat_messages', 'chat_agents', 'chat_analysis', 'rag_conversations', 'rag_messages', 'rag_documents', 'rag_chunks', 'rag_rules'],
    roles: ['Supervisor Contact Center', 'Analista', 'Usuarios de Simón (próximamente todo el Sanatorio)'],
    estado: 'produccion',
  },
  {
    id: 'liquidaciones',
    name: 'liquidaciones',
    displayName: 'Liquidaciones',
    icon: <FileText size={28} />,
    color: '#16a34a',
    repo: 'lucasmmg12/guardias',
    repoUrl: 'https://github.com/lucasmmg12/guardias',
    sinopsis: 'Administración de guardias y liquidaciones de personal — importación de fichadas, cálculo de totales mensuales y reportes.',
    descripcionDetallada: `El sistema de Liquidaciones maneja el flujo completo de fichadas del personal del Sanatorio: desde la importación masiva de registros de entrada/salida hasta el cálculo automático de totales mensuales para la liquidación de haberes.

Permite la gestión de colaboradores (altas, bajas, datos de legajo), importación de fichadas desde archivos externos, visualización del calendario de asistencia, y generación de totales mensuales automáticos.

Es la herramienta principal del área de RRHH para el control de asistencia y la preparación de la información que alimenta el proceso de liquidación de sueldos.`,
    funcionalidades: [
      'Gestión de colaboradores (CRUD)',
      'Importación masiva de fichadas',
      'Calendario de asistencia por colaborador',
      'Cálculo de totales mensuales automáticos',
      'Reportes para liquidación de haberes',
      'Filtros por período, sector y colaborador',
      'Visualización de registros diarios',
    ],
    stack: [
      { label: 'Frontend', items: ['React', 'Vite'] },
      { label: 'Backend', items: ['Supabase (PostgreSQL)'] },
      { label: 'Librerías', items: ['Lucide React', 'React Router DOM'] },
    ],
    tablasPrincipales: ['fichadas_colaboradores', 'fichadas_registros', 'fichadas_importaciones', 'fichadas_totales_mensuales'],
    roles: ['Analista RRHH', 'Liquidador'],
    estado: 'produccion',
  },
  {
    id: 'rrhh-organigrama',
    name: 'rrhh-organigrama',
    displayName: 'Recursos Humanos',
    icon: <Building2 size={28} />,
    color: '#64748b',
    repo: 'lucasmmg12/organigrama',
    repoUrl: 'https://github.com/lucasmmg12/organigrama',
    sinopsis: 'Visualización interactiva de la estructura institucional — jerarquía organizacional con 5 niveles, panel de manpower y vista responsive.',
    descripcionDetallada: `El Organigrama Digital transforma la estructura institucional del Sanatorio Argentino de documentos Word estáticos a una herramienta de gestión interactiva.

Implementa la estrategia "Fluid Hierarchy": en desktop muestra un árbol horizontal con conectores Bézier suaves, mientras que en mobile se transforma automáticamente en una lista accordion vertical con guías visuales de nivel.

La jerarquía sigue 5 niveles institucionales (Jefe → Sub Jefe → Coordinador → Supervisor → Colaborador), cada uno con su propio sistema de colores: azul/cyan para servicios asistenciales (UCI, Pediatría, Quirófano) y gris/neutro para áreas administrativas (RRHH, Compras).

Incluye un panel lateral de "Manpower Intelligence" con datos técnicos (ID de posición, centro de costos, turno, FTE) y acciones contextuales según el estado del cargo (vacante, ocupado, congelado, licencia).

Los datos se extraen automáticamente de documentos Word (SmartArt/OOXML) mediante un pipeline Node.js de reverse-engineering.`,
    funcionalidades: [
      'Árbol organizacional interactivo (5 niveles)',
      'Vista "Fluid Hierarchy" (tree desktop → accordion mobile)',
      'Panel de Manpower con datos técnicos por cargo',
      'Diferenciación visual por tipo (asistencial vs administrativo)',
      'Estados de cargo (ocupado, vacante, congelado, licencia)',
      'Pipeline de extracción desde Word OOXML/SmartArt',
      'Búsqueda predictiva con auto-scroll al nodo',
      'Conectores Bézier suaves en vista desktop',
      'Accesibilidad WAI-ARIA y navegación por teclado',
    ],
    stack: [
      { label: 'Frontend', items: ['React', 'Vite', 'JavaScript (JSX)'] },
      { label: 'Backend', items: ['Supabase (PostgreSQL)'] },
      { label: 'Datos', items: ['Pipeline Node.js (OOXML → JSON)'] },
      { label: 'Librerías', items: ['Lucide React'] },
    ],
    tablasPrincipales: ['organization_nodes', 'node_attachments'],
    roles: ['RRHH', 'Directivos', 'Consulta General'],
    estado: 'produccion',
  },
  {
    id: 'osptxt',
    name: 'osptxt',
    displayName: 'OSP-TXT',
    icon: <BarChart3 size={28} />,
    color: '#dc2626',
    repo: 'lucasmmg12/osptxt',
    repoUrl: 'https://github.com/lucasmmg12/osptxt',
    sinopsis: 'Gestión de prestaciones y obras sociales — procesamiento de archivos TXT de facturación y seguimiento de prestaciones.',
    descripcionDetallada: `OSP-TXT es el sistema de gestión de prestaciones y obras sociales del Sanatorio Argentino. Procesa archivos TXT de facturación de obras sociales, permite el seguimiento de prestaciones realizadas y facilita la conciliación entre lo facturado y lo cobrado.

El sistema automatiza el procesamiento de los formatos de intercambio de datos con las obras sociales, reduciendo el tiempo manual de carga y minimizando errores en la facturación.`,
    funcionalidades: [
      'Procesamiento de archivos TXT de facturación',
      'Seguimiento de prestaciones realizadas',
      'Conciliación facturado vs cobrado',
      'Gestión de convenios con obras sociales',
      'Reportes de facturación por período',
      'Importación masiva de datos',
    ],
    stack: [
      { label: 'Frontend', items: ['React', 'Vite'] },
      { label: 'Backend', items: ['Supabase (PostgreSQL)'] },
    ],
    tablasPrincipales: ['prestaciones', 'obras_sociales', 'facturacion'],
    roles: ['Facturación', 'Auditoría Médica'],
    estado: 'produccion',
  },
];

const ICON_MAP: Record<string, React.ReactNode> = {
  Code: <Code size={16} />,
  Database: <Database size={16} />,
  Shield: <Shield size={16} />,
  Layers: <Layers size={16} />,
  Server: <Server size={16} />,
  Globe: <Globe size={16} />,
  Brain: <Brain size={16} />,
  Users: <Users size={16} />,
  MessageSquare: <MessageSquare size={16} />,
  Workflow: <Workflow size={16} />,
  Calendar: <Calendar size={16} />,
  LayoutDashboard: <LayoutDashboard size={16} />,
};

const STACK_ICONS: Record<string, React.ReactNode> = {
  Frontend: <Code size={16} />,
  Backend: <Database size={16} />,
  IA: <Brain size={16} />,
  Mensajería: <MessageSquare size={16} />,
  Librerías: <Layers size={16} />,
  Datos: <Server size={16} />,
  Fuente: <Globe size={16} />,
};

const ESTADO_LABELS: Record<string, { label: string; className: string }> = {
  produccion: { label: 'En Producción', className: 'badge--green' },
  desarrollo: { label: 'En Desarrollo', className: 'badge--amber' },
  prototipo: { label: 'Prototipo', className: 'badge--purple' },
};

export default function DocumentationPage() {
  const [expandedSystem, setExpandedSystem] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedSystem(expandedSystem === id ? null : id);
  };

  return (
    <div className="page">
      <div className="page__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--sa-primary), var(--sa-secondary))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 4px 16px rgba(0, 84, 139, 0.3)',
          }}>
            <BookOpen size={24} />
          </div>
          <div>
            <h1 className="page__title">Documentación del Ecosistema</h1>
            <p className="page__subtitle">Referencia técnica completa de cada sistema — arquitectura, funcionalidades, stack y repositorios</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="stats-grid" style={{ marginBottom: '32px' }}>
        <div className="stat-card">
          <div className="stat-card__icon" style={{ background: 'rgba(0, 84, 139, 0.08)', color: 'var(--sa-primary)' }}>
            <Layers size={22} />
          </div>
          <div>
            <div className="stat-card__value">{SYSTEMS_DOCS.length}</div>
            <div className="stat-card__label">Sistemas Registrados</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon" style={{ background: 'rgba(34, 197, 94, 0.08)', color: 'var(--sa-green-600)' }}>
            <Globe size={22} />
          </div>
          <div>
            <div className="stat-card__value">{SYSTEMS_DOCS.filter(s => s.estado === 'produccion').length}</div>
            <div className="stat-card__label">En Producción</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon" style={{ background: 'rgba(124, 58, 237, 0.08)', color: 'var(--sa-purple-600)' }}>
            <Github size={22} />
          </div>
          <div>
            <div className="stat-card__value">{SYSTEMS_DOCS.length}</div>
            <div className="stat-card__label">Repositorios GitHub</div>
          </div>
        </div>
      </div>

      {/* Systems Documentation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {SYSTEMS_DOCS.map((sys, index) => {
          const isExpanded = expandedSystem === sys.id;
          const estadoInfo = ESTADO_LABELS[sys.estado];

          return (
            <div
              key={sys.id}
              className="card"
              style={{
                animation: `fadeIn 0.5s ease ${index * 0.05}s both`,
                cursor: 'default',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'none'; }}
            >
              {/* Header (always visible) */}
              <div
                style={{
                  padding: '24px 28px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  cursor: 'pointer',
                  borderBottom: isExpanded ? '1px solid var(--sa-slate-100)' : 'none',
                }}
                onClick={() => toggleExpand(sys.id)}
              >
                {/* Icon */}
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: 'var(--radius-md)',
                  background: sys.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  flexShrink: 0,
                  boxShadow: `0 4px 12px ${sys.color}40`,
                }}>
                  {sys.icon}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      fontFamily: 'var(--font-display)',
                      color: 'var(--sa-primary)',
                      letterSpacing: '-0.01em',
                      margin: 0,
                    }}>
                      {sys.displayName}
                    </h3>
                    <span className={`badge ${estadoInfo.className}`}>{estadoInfo.label}</span>
                  </div>
                  <p style={{
                    fontSize: '13px',
                    color: 'var(--color-text-secondary)',
                    marginTop: '4px',
                    lineHeight: 1.5,
                  }}>
                    {sys.sinopsis}
                  </p>
                </div>

                {/* Expand/Collapse */}
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--sa-slate-50)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--sa-slate-400)',
                  flexShrink: 0,
                  transition: 'all var(--transition-fast)',
                }}>
                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div style={{
                  padding: '28px',
                  animation: 'fadeIn 0.3s ease both',
                }}>
                  {/* Description */}
                  <div style={{ marginBottom: '28px' }}>
                    <h4 style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      fontFamily: 'var(--font-display)',
                      color: 'var(--sa-primary)',
                      marginBottom: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}>
                      Descripción Detallada
                    </h4>
                    <div style={{
                      fontSize: '14px',
                      color: 'var(--sa-slate-600)',
                      lineHeight: 1.8,
                      whiteSpace: 'pre-line',
                      background: 'var(--sa-slate-50)',
                      padding: '20px 24px',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: `4px solid ${sys.color}`,
                    }}>
                      {sys.descripcionDetallada}
                    </div>
                  </div>

                  {/* Two Column Layout */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: '24px',
                    marginBottom: '28px',
                  }}>
                    {/* Funcionalidades */}
                    <div>
                      <h4 style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        fontFamily: 'var(--font-display)',
                        color: 'var(--sa-primary)',
                        marginBottom: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}>
                        Funcionalidades
                      </h4>
                      <ul style={{
                        listStyle: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}>
                        {sys.funcionalidades.map((f, i) => (
                          <li key={i} style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            fontSize: '13px',
                            color: 'var(--sa-slate-600)',
                            lineHeight: 1.5,
                          }}>
                            <span style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: sys.color,
                              marginTop: '6px',
                              flexShrink: 0,
                            }} />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Stack Técnico */}
                    <div>
                      <h4 style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        fontFamily: 'var(--font-display)',
                        color: 'var(--sa-primary)',
                        marginBottom: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}>
                        Stack Técnico
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {sys.stack.map((group, i) => (
                          <div key={i} style={{
                            background: 'var(--sa-slate-50)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '14px 16px',
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              marginBottom: '8px',
                              color: 'var(--sa-primary)',
                            }}>
                              {STACK_ICONS[group.label] || <Code size={16} />}
                              <span style={{
                                fontSize: '12px',
                                fontWeight: 700,
                                fontFamily: 'var(--font-display)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                              }}>
                                {group.label}
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {group.items.map((item, j) => (
                                <span key={j} style={{
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  padding: '4px 10px',
                                  borderRadius: 'var(--radius-full)',
                                  background: 'white',
                                  color: 'var(--sa-slate-600)',
                                  border: '1px solid var(--sa-slate-200)',
                                }}>
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Tables, Roles, Repo */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                    marginBottom: '20px',
                  }}>
                    {/* Tablas */}
                    <div style={{
                      background: 'var(--sa-slate-50)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '16px',
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '10px',
                        color: 'var(--sa-primary)',
                      }}>
                        <Database size={16} />
                        <span style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          fontFamily: 'var(--font-display)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                        }}>
                          Tablas Principales
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {sys.tablasPrincipales.map((t, i) => (
                          <code key={i} style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: 'rgba(0, 84, 139, 0.06)',
                            color: 'var(--sa-primary)',
                            fontFamily: 'monospace',
                          }}>
                            {t}
                          </code>
                        ))}
                      </div>
                    </div>

                    {/* Roles */}
                    <div style={{
                      background: 'var(--sa-slate-50)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '16px',
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '10px',
                        color: 'var(--sa-primary)',
                      }}>
                        <Users size={16} />
                        <span style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          fontFamily: 'var(--font-display)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                        }}>
                          Roles de Acceso
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {sys.roles.map((r, i) => (
                          <span key={i} style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 10px',
                            borderRadius: 'var(--radius-full)',
                            background: 'rgba(124, 58, 237, 0.06)',
                            color: 'var(--sa-purple-600)',
                          }}>
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Repository Link */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px 20px',
                    background: 'linear-gradient(135deg, var(--sa-slate-900), #0a1929)',
                    borderRadius: 'var(--radius-md)',
                    color: 'white',
                    flexWrap: 'wrap',
                  }}>
                    <Github size={20} />
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        fontFamily: 'var(--font-display)',
                      }}>
                        {sys.repo}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--sa-slate-400)',
                        marginTop: '2px',
                      }}>
                        Repositorio oficial — Branch: main
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <a
                        href={sys.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 16px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: 700,
                          fontFamily: 'var(--font-display)',
                          textDecoration: 'none',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          transition: 'all var(--transition-fast)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        }}
                      >
                        <ExternalLink size={14} />
                        Ver Repo
                      </a>
                      <a
                        href={`${sys.repoUrl}/archive/refs/heads/main.zip`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 16px',
                          background: 'var(--sa-secondary)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: 700,
                          fontFamily: 'var(--font-display)',
                          textDecoration: 'none',
                          transition: 'all var(--transition-fast)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '0.9';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '1';
                        }}
                      >
                        <Download size={14} />
                        Descargar ZIP
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div style={{
        marginTop: '40px',
        padding: '24px 28px',
        background: 'rgba(0, 84, 139, 0.03)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid rgba(0, 84, 139, 0.08)',
        textAlign: 'center',
      }}>
        <p style={{
          fontSize: '13px',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.6,
        }}>
          Documentación generada por el <strong>Departamento de Innovación y Transformación Digital</strong> — Sanatorio Argentino
          <br />
          Todos los repositorios bajo <a href="https://github.com/lucasmmg12" target="_blank" rel="noopener noreferrer" style={{
            color: 'var(--sa-primary)',
            fontWeight: 700,
            textDecoration: 'none',
          }}>github.com/lucasmmg12</a> • Supabase Project: <code style={{
            fontSize: '11px',
            background: 'var(--sa-slate-100)',
            padding: '2px 6px',
            borderRadius: '4px',
          }}>hakysnqiryimxbwdslwe</code>
        </p>
      </div>
    </div>
  );
}
