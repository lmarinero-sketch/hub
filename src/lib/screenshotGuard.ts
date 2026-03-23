/**
 * Screenshot Guard — Hub Sanatorio Argentino
 * 
 * Detecta intentos de captura de pantalla y los registra
 * en hub_logs_sesion como evento 'screenshot_attempt'.
 * 
 * Detecciones soportadas:
 *   ✅ PrintScreen (Windows)
 *   ✅ Cmd+Shift+3/4/5 (Mac)
 *   ✅ Ctrl+P (Imprimir → posible captura)
 *   ✅ beforeprint event (diálogo de impresión)
 * 
 * Limitaciones conocidas:
 *   ❌ Win+Shift+S (Snipping Tool) — el OS lo intercepta
 *   ❌ Herramientas externas (Lightshot, ShareX)
 *   ❌ Capturas mobile (power+volume)
 *   ❌ Extensiones de Chrome
 */

import { supabase } from './supabase';

let initialized = false;
let userId: string | null = null;
let cooldown = false;

const COOLDOWN_MS = 5000; // Evitar spam de logs (5s entre detecciones)

/**
 * Registra el intento de captura en hub_logs_sesion
 */
async function logScreenshotAttempt(method: string) {
  if (cooldown) return;
  cooldown = true;
  setTimeout(() => { cooldown = false; }, COOLDOWN_MS);

  console.warn(`[ScreenshotGuard] 📸 Captura detectada: ${method}`);

  try {
    await supabase.from('hub_logs_sesion').insert({
      user_id: userId,
      evento: 'screenshot_attempt',
      sistema_id: null, // Se puede setear por proyecto
      user_agent: navigator.userAgent,
      metadata: {
        method,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.warn('[ScreenshotGuard] Error logging:', e);
  }
}

/**
 * Handler de teclado — detecta PrintScreen y atajos de captura
 */
function handleKeyDown(e: KeyboardEvent) {
  // PrintScreen (Windows)
  if (e.key === 'PrintScreen') {
    e.preventDefault();
    logScreenshotAttempt('PrintScreen');
    return;
  }

  // Ctrl+PrintScreen
  if (e.ctrlKey && e.key === 'PrintScreen') {
    e.preventDefault();
    logScreenshotAttempt('Ctrl+PrintScreen');
    return;
  }

  // Ctrl+P (Imprimir)
  if (e.ctrlKey && e.key === 'p') {
    logScreenshotAttempt('Ctrl+P (Print)');
    // No prevenimos el default — podría ser legítimo
    return;
  }

  // Mac: Cmd+Shift+3 (full screenshot)
  if (e.metaKey && e.shiftKey && e.key === '3') {
    logScreenshotAttempt('Cmd+Shift+3 (Mac Full)');
    return;
  }

  // Mac: Cmd+Shift+4 (selection screenshot)
  if (e.metaKey && e.shiftKey && e.key === '4') {
    logScreenshotAttempt('Cmd+Shift+4 (Mac Selection)');
    return;
  }

  // Mac: Cmd+Shift+5 (screenshot tool)
  if (e.metaKey && e.shiftKey && e.key === '5') {
    logScreenshotAttempt('Cmd+Shift+5 (Mac Tool)');
    return;
  }
}

/**
 * Handler de impresión — detecta cuando se abre el diálogo de imprimir
 */
function handleBeforePrint() {
  logScreenshotAttempt('Print Dialog (beforeprint)');
}

/**
 * Inicializa el Screenshot Guard
 * Llamar una sola vez en el componente raíz (App.tsx)
 * 
 * @param currentUserId - UUID del usuario autenticado (puede ser null si no hay sesión)
 * @param sistemaId - UUID opcional del sistema (para identificar desde dónde se capturó)
 */
export function initScreenshotGuard(currentUserId: string | null, sistemaId?: string) {
  if (initialized) return;
  initialized = true;
  userId = currentUserId;

  // Keyboard events
  document.addEventListener('keydown', handleKeyDown, { capture: true });

  // Print events
  window.addEventListener('beforeprint', handleBeforePrint);

  console.info('[ScreenshotGuard] 🛡️ Activo — monitoreando capturas de pantalla');
}

/**
 * Actualiza el userId (ej: después del login)
 */
export function updateScreenshotGuardUser(newUserId: string | null) {
  userId = newUserId;
}

/**
 * Destruye el guard (cleanup)
 */
export function destroyScreenshotGuard() {
  document.removeEventListener('keydown', handleKeyDown, { capture: true });
  window.removeEventListener('beforeprint', handleBeforePrint);
  initialized = false;
  userId = null;
}
