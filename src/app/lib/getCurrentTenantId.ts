// src/lib/getCurrentTenantId.ts

export function getCurrentTenantId(): string {
  // Solo ejecutamos esto en el navegador (cliente)
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    
    // 1. Si estamos en desarrollo local
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'localhost'; // Debe coincidir con el subdomain de tu seed
    }
    
    // 2. Si estamos en un subdominio (ej: prettywitches.emprendefacil.com.ar)
    const parts = host.split('.');
    if (parts.length >= 2) {
      return parts[0]; // Retorna 'prettywitches'
    }
  }
  
  // 3. Fallback por si acaso (ej: durante Server Side Rendering)
  return process.env.NEXT_PUBLIC_DEFAULT_TENANT || 'localhost';
}