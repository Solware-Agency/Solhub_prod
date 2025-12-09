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

  // Actualizar todos los link tags de favicon
  const faviconLinks = document.querySelectorAll("link[rel~='icon'], link[rel~='shortcut icon'], link[rel~='apple-touch-icon']");
  
  faviconLinks.forEach((link) => {
    (link as HTMLLinkElement).href = faviconUrl;
  });

  // Si no hay ningún link, crear uno nuevo
  if (faviconLinks.length === 0) {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/x-icon';
    link.href = faviconUrl;
    document.head.appendChild(link);
  }
  
  console.log('✅ Favicon updated to:', faviconUrl);
}

/**
 * Restaura el favicon por defecto
 */
export function resetFavicon() {
  updateFavicon('/vite.svg');
}
