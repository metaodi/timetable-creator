import {
  SCHEMA_VERSION,
  type Cell,
  type Day,
  type LegendEntry,
  type LessonDisplay,
  type LessonIcon,
  type LessonType,
  type Row,
  type TimetableConfig,
} from '../types/config';
import { cellKey, parseCellKey } from './grid';
import { newId } from './ids';

export type ParseResult =
  | { ok: true; config: TimetableConfig }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function optionalStr(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function parseDays(raw: unknown): Day[] {
  if (!Array.isArray(raw)) return [];
  const days: Day[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const label = str(entry.label).trim();
    if (!label) continue;
    let id = str(entry.id) || newId('day');
    while (seen.has(id)) id = newId('day');
    seen.add(id);
    days.push({ id, label });
  }
  return days;
}

function parseRows(raw: unknown): Row[] {
  if (!Array.isArray(raw)) return [];
  const rows: Row[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    let id = str(entry.id) || newId('row');
    while (seen.has(id)) id = newId('row');
    seen.add(id);

    if (entry.kind === 'separator') {
      rows.push({ kind: 'separator', id, label: str(entry.label, 'Pause') });
      continue;
    }
    const row: Row = {
      kind: 'lesson',
      id,
      start: str(entry.start, '00:00'),
      end: str(entry.end, '00:00'),
    };
    const label = optionalStr(entry.label);
    if (label) row.label = label;
    rows.push(row);
  }
  return rows;
}

function parseIcon(raw: unknown): LessonIcon | undefined {
  if (!isRecord(raw)) return undefined;
  if (raw.kind === 'emoji') {
    const value = optionalStr(raw.value);
    return value ? { kind: 'emoji', value } : undefined;
  }
  if (raw.kind === 'image') {
    const dataUrl = str(raw.dataUrl);
    // Nur eingebettete Bilder zulassen — verhindert, dass eine fremde Config
    // beim Öffnen externe URLs nachlädt.
    return dataUrl.startsWith('data:image/') ? { kind: 'image', dataUrl } : undefined;
  }
  return undefined;
}

function parseDisplay(raw: unknown): LessonDisplay {
  return raw === 'image' || raw === 'both' || raw === 'text' ? raw : 'text';
}

function parseLessonTypes(raw: unknown): LessonType[] {
  if (!Array.isArray(raw)) return [];
  const types: LessonType[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    let id = str(entry.id) || newId('lt');
    while (seen.has(id)) id = newId('lt');
    seen.add(id);

    const type: LessonType = {
      id,
      abbreviation: str(entry.abbreviation).trim(),
      name: str(entry.name).trim(),
      display: parseDisplay(entry.display),
    };
    const teacher = optionalStr(entry.teacher);
    const location = optionalStr(entry.location);
    const color = optionalStr(entry.color);
    const icon = parseIcon(entry.icon);
    if (teacher) type.teacher = teacher;
    if (location) type.location = location;
    if (color) type.color = color;
    if (icon) type.icon = icon;
    if (entry.showInLegend === false) type.showInLegend = false;

    if (!type.abbreviation && !type.name && !type.icon) continue;
    types.push(type);
  }
  return types;
}

function parseCells(
  raw: unknown,
  rowIds: Set<string>,
  dayIds: Set<string>,
  lessonTypeIds: Set<string>,
): Record<string, Cell> {
  if (!isRecord(raw)) return {};
  const cells: Record<string, Cell> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!isRecord(value)) continue;
    const parsed = parseCellKey(key);
    // Verwaiste Zellen (gelöschte Zeile/Spalte) werden verworfen.
    if (!parsed || !rowIds.has(parsed.rowId) || !dayIds.has(parsed.dayId)) continue;

    const cell: Cell = {};
    const lessonTypeId = optionalStr(value.lessonTypeId);
    if (lessonTypeId && lessonTypeIds.has(lessonTypeId)) cell.lessonTypeId = lessonTypeId;
    const note = optionalStr(value.note);
    if (note) cell.note = note;
    if (value.blocked === true) cell.blocked = true;
    const span = typeof value.daySpan === 'number' ? Math.trunc(value.daySpan) : 1;
    if (span > 1) cell.daySpan = span;

    if (value.split === true) cell.split = true;
    const secondLessonTypeId = optionalStr(value.secondLessonTypeId);
    if (secondLessonTypeId && lessonTypeIds.has(secondLessonTypeId)) {
      cell.secondLessonTypeId = secondLessonTypeId;
    }
    const secondNote = optionalStr(value.secondNote);
    if (secondNote) cell.secondNote = secondNote;

    if (Object.keys(cell).length === 0) continue;
    cells[cellKey(parsed.rowId, parsed.dayId)] = cell;
  }
  return cells;
}

function parseLegendEntries(raw: unknown): LegendEntry[] {
  if (!Array.isArray(raw)) return [];
  const entries: LegendEntry[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const entry: LegendEntry = {
      id: str(item.id) || newId('leg'),
      abbreviation: str(item.abbreviation),
      name: str(item.name),
    };
    const teacher = optionalStr(item.teacher);
    const location = optionalStr(item.location);
    if (teacher) entry.teacher = teacher;
    if (location) entry.location = location;
    if (!entry.abbreviation && !entry.name) continue;
    entries.push(entry);
  }
  return entries;
}

/**
 * Hebt eine ältere Konfiguration auf die aktuelle Schemaversion.
 * Konfigurationen ohne `schemaVersion` stammen aus der ersten Fassung und
 * entsprechen bereits Version 1.
 */
export function migrateConfig(raw: Record<string, unknown>): Record<string, unknown> {
  const version = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 1;
  if (version > SCHEMA_VERSION) {
    throw new Error(
      `Diese Datei wurde mit einer neueren Version erstellt (Schema ${version}, unterstützt wird ${SCHEMA_VERSION}).`,
    );
  }
  // Künftige Migrationen: hier schrittweise von `version` auf SCHEMA_VERSION heben.
  return { ...raw, schemaVersion: SCHEMA_VERSION };
}

/**
 * Prüft und säubert beliebiges JSON zu einer gültigen Konfiguration.
 * Unbekannte Felder fallen weg, kaputte Teile werden verworfen statt zu crashen.
 */
export function parseConfig(input: unknown): ParseResult {
  if (!isRecord(input)) return { ok: false, error: 'Die Datei enthält kein Konfigurationsobjekt.' };

  let raw: Record<string, unknown>;
  try {
    raw = migrateConfig(input);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unbekanntes Schema.' };
  }

  const days = parseDays(raw.days);
  const rows = parseRows(raw.rows);
  if (days.length === 0) return { ok: false, error: 'Die Konfiguration enthält keine Wochentage.' };
  if (rows.length === 0) return { ok: false, error: 'Die Konfiguration enthält keine Zeilen.' };

  const lessonTypes = parseLessonTypes(raw.lessonTypes);
  const meta = isRecord(raw.meta) ? raw.meta : {};
  const legend = isRecord(raw.legend) ? raw.legend : {};

  const config: TimetableConfig = {
    schemaVersion: SCHEMA_VERSION,
    id: str(raw.id) || newId('plan'),
    name: str(raw.name) || str(meta.title) || 'Stundenplan',
    meta: {
      title: str(meta.title, 'Stundenplan'),
      subtitle: str(meta.subtitle),
    },
    days,
    rows,
    lessonTypes,
    cells: parseCells(
      raw.cells,
      new Set(rows.map((row) => row.id)),
      new Set(days.map((day) => day.id)),
      new Set(lessonTypes.map((type) => type.id)),
    ),
    legend: {
      visible: legend.visible !== false,
      extraEntries: parseLegendEntries(legend.extraEntries),
    },
  };

  const logo = str(meta.logoDataUrl);
  if (logo.startsWith('data:image/')) config.meta.logoDataUrl = logo;

  return { ok: true, config };
}
