/**
 * Hub Session Tracker — Sanatorio Argentino
 * 
 * Módulo liviano que cada sistema del ecosistema importa para registrar
 * eventos de sesión en hub_logs_sesion. Compatible con cualquier proyecto
 * que use el mismo Supabase.
 * 
 * USO:
 *   import { trackHubLogin, trackHubLogout } from './hubTracker'
 *   // Después de login exitoso:
 *   trackHubLogin(supabase, userId)
 *   // Al hacer logout:
 *   trackHubLogout(supabase, userId)
 */

// Obtener IP pública
async function getPublicIP() {
  try {
    const res = await fetch('https://api.ipify.org?format=json')
    const data = await res.json()
    return data.ip || null
  } catch {
    return null
  }
}

// Obtener geolocalización (no bloqueante)
function getGeoLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
    )
  })
}

/**
 * Registra un evento en hub_logs_sesion
 * @param {object} supabase - Cliente de Supabase del sistema
 * @param {string} userId - UUID del usuario autenticado
 * @param {string} evento - Tipo de evento: 'login', 'logout', 'access_system'
 * @param {string|null} sistemaId - UUID del sistema (de hub_sistemas)
 */
async function trackEvent(supabase, userId, evento, sistemaId = null) {
  try {
    const [ip, geo] = await Promise.all([getPublicIP(), getGeoLocation()])
    
    await supabase.from('hub_logs_sesion').insert({
      user_id: userId,
      evento,
      sistema_id: sistemaId,
      ip_address: ip,
      user_agent: navigator.userAgent,
      latitud: geo?.lat || null,
      longitud: geo?.lng || null,
      metadata: { source: 'hub_tracker', timestamp: new Date().toISOString() },
    })
  } catch (err) {
    console.warn('[HubTracker] Error logging event:', err)
  }
}

// ──── Exported functions per system ────

// SISTEMA: Calidad (Dora)
export const CALIDAD_ID = '646c05c8-edbb-4201-8aa9-fb8bae8449f1'
export function trackCalidadLogin(supabase, userId) { trackEvent(supabase, userId, 'login', CALIDAD_ID) }
export function trackCalidadLogout(supabase, userId) { trackEvent(supabase, userId, 'logout', CALIDAD_ID) }

// SISTEMA: ADM-QUI (Quirófano)
export const ADMQUI_ID = '4e16cb5f-68b1-410d-871c-6cc17489bf00'
export function trackAdmQuiLogin(supabase, userId) { trackEvent(supabase, userId, 'login', ADMQUI_ID) }
export function trackAdmQuiLogout(supabase, userId) { trackEvent(supabase, userId, 'logout', ADMQUI_ID) }

// SISTEMA: Enfermería
export const ENFERMERIA_ID = '50945c9d-6a01-41dd-9d5f-d3ff55c99d20'
export function trackEnfermeriaLogin(supabase, userId) { trackEvent(supabase, userId, 'login', ENFERMERIA_ID) }
export function trackEnfermeriaLogout(supabase, userId) { trackEvent(supabase, userId, 'logout', ENFERMERIA_ID) }

// SISTEMA: Contact Center
export const CONTACTCENTER_ID = '89e254d3-f45f-445c-b6b3-cb6e11054ec1'
export function trackContactCenterLogin(supabase, userId) { trackEvent(supabase, userId, 'login', CONTACTCENTER_ID) }
export function trackContactCenterLogout(supabase, userId) { trackEvent(supabase, userId, 'logout', CONTACTCENTER_ID) }

// SISTEMA: Liquidaciones
export const LIQUIDACIONES_ID = '533e0703-143c-4527-aa6c-86b981253a82'
export function trackLiquidacionesLogin(supabase, userId) { trackEvent(supabase, userId, 'login', LIQUIDACIONES_ID) }
export function trackLiquidacionesLogout(supabase, userId) { trackEvent(supabase, userId, 'logout', LIQUIDACIONES_ID) }

// SISTEMA: RRHH (Recursos Humanos)
export const RRHH_ID = '6046063c-f071-4b98-9646-920b34b748db'
export function trackRRHHLogin(supabase, userId) { trackEvent(supabase, userId, 'login', RRHH_ID) }
export function trackRRHHLogout(supabase, userId) { trackEvent(supabase, userId, 'logout', RRHH_ID) }

// SISTEMA: OSP-TXT
export const OSPTXT_ID = 'c39dda44-f97f-4fe9-a0c8-56203007b2ca'
export function trackOspTxtLogin(supabase, userId) { trackEvent(supabase, userId, 'login', OSPTXT_ID) }
export function trackOspTxtLogout(supabase, userId) { trackEvent(supabase, userId, 'logout', OSPTXT_ID) }

// Generic — for any system by ID
export { trackEvent as trackHubEvent }
