/**
 * Utilidades para cambiar el favicon dinámicamente
 */

/**
 * Cambia el favicon del sitio dinámicamente
 * @param faviconUrl URL del nuevo favicon
 */
export function updateFavicon(faviconUrl: string | null | undefined) {
  if (!faviconUrl) {
    console.warn('⚠️ No favicon URL provided');
    return;
  }

  // Buscar el elemento link existente o crear uno nuevo
  let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
  
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }

  // Actualizar el href
  link.href = faviconUrl;
  
  console.log('✅ Favicon updated to:', faviconUrl);
}

/**
 * Restaura el favicon por defecto
 */
export function resetFavicon() {
  updateFavicon('/vite.svg');
}
