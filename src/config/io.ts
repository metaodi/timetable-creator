import type { TimetableConfig } from '../types/config';
import { parseConfig, type ParseResult } from './schema';

/** Dateiname aus dem Plannamen, ohne Sonderzeichen. */
export function suggestedFileName(config: TimetableConfig): string {
  const slug = config.name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'stundenplan'}.json`;
}

export function configToJson(config: TimetableConfig): string {
  return JSON.stringify(config, null, 2);
}

/** Lädt die Konfiguration als .json-Datei herunter. */
export function downloadConfig(config: TimetableConfig): void {
  const blob = new Blob([configToJson(config)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = suggestedFileName(config);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Liest eine exportierte Konfigurationsdatei wieder ein. */
export async function readConfigFile(file: File): Promise<ParseResult> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, error: 'Die Datei konnte nicht gelesen werden.' };
  }
  try {
    return parseConfig(JSON.parse(text) as unknown);
  } catch {
    return { ok: false, error: 'Die Datei ist kein gültiges JSON.' };
  }
}

const MAX_IMAGE_SIZE = 256;

/**
 * Liest ein Bild ein und verkleinert es auf `maxSize` Pixel Kantenlänge.
 * Das Ergebnis ist eine Data-URL — dadurch bleibt die Konfiguration eine
 * einzige, weitergebbare Datei, ohne dass sie durch Fotos unbrauchbar gross wird.
 */
export function readImageAsDataUrl(file: File, maxSize = MAX_IMAGE_SIZE): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Bitte eine Bilddatei auswählen.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Das Bild konnte nicht gelesen werden.'));
    reader.onload = () => {
      const source = String(reader.result);
      // SVG lässt sich nicht sinnvoll rastern und ist ohnehin klein.
      if (file.type === 'image/svg+xml') {
        resolve(source);
        return;
      }
      const image = new Image();
      image.onerror = () => reject(new Error('Das Bild konnte nicht geladen werden.'));
      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) {
          resolve(source);
          return;
        }
        context.drawImage(image, 0, 0, width, height);
        // PNG erhält Transparenz, die bei Symbolen meist gewünscht ist.
        resolve(canvas.toDataURL('image/png'));
      };
      image.src = source;
    };
    reader.readAsDataURL(file);
  });
}
