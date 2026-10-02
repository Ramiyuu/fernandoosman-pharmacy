/**
 * Extensions that are never accepted, even as an inner extension
 * ("report.exe.pdf"). The real gate is the file signature check; this list
 * catches obvious disguises early with a clear error message.
 */
export const BLOCKED_EXTENSIONS = new Set([
  'exe', 'dll', 'msi', 'com', 'scr', 'pif', 'cpl', 'bat', 'cmd', 'ps1', 'psm1', 'vbs', 'vbe', 'js', 'jse', 'mjs', 'cjs',
  'wsf', 'wsh', 'hta', 'jar', 'class', 'sh', 'bash', 'zsh', 'csh', 'php', 'phtml', 'php3', 'php4', 'php5', 'phar', 'asp',
  'aspx', 'jsp', 'cgi', 'pl', 'py', 'rb', 'html', 'htm', 'xhtml', 'shtml', 'svg', 'svgz', 'xml', 'xsl', 'swf', 'lnk',
  'reg', 'app', 'apk', 'dmg', 'iso', 'deb', 'rpm', 'elf', 'so', 'dylib',
]);

// Control (Cc) and format (Cf) characters: zero-width spaces, bidi overrides, BOM, etc.
const CONTROL_CHARACTERS = /[\p{Cc}\p{Cf}]/gu;
const PATH_SEPARATORS = /[\\/]+/g;
const RESERVED_CHARACTERS = /[<>:"|?*]+/g;

/**
 * Produces a safe *display* name from a user-supplied filename. It is only
 * ever shown to people (React escapes it); storage paths are generated
 * server-side from random UUIDs and never derived from this value.
 */
export function sanitizeDisplayFilename(name: string, fallback = 'document.pdf'): string {
  const base = name.normalize('NFC').split(PATH_SEPARATORS).pop() ?? '';
  const cleaned = base
    .replace(CONTROL_CHARACTERS, '')
    .replace(RESERVED_CHARACTERS, '_')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+/, '')
    .trim();

  if (!cleaned) return fallback;
  if (cleaned.length <= 180) return cleaned;

  const extension = getExtension(cleaned);
  const stem = cleaned.slice(0, 180 - (extension ? extension.length + 1 : 0));
  return extension ? `${stem}.${extension}` : stem;
}

export function getExtension(name: string): string {
  const match = /\.([a-z0-9]{1,10})$/i.exec(name.trim());
  return match ? match[1].toLowerCase() : '';
}

/** True if the final or any inner extension is on the block list. */
export function hasBlockedExtension(name: string): boolean {
  const parts = name.toLowerCase().split('.').slice(1);
  return parts.some((part) => BLOCKED_EXTENSIONS.has(part.trim()));
}
