import type { Cell, Day, LessonRow, Row, TimetableConfig } from '../types/config';

/** Schlüssel einer Zelle in `config.cells`. */
export function cellKey(rowId: string, dayId: string): string {
  return `${rowId}|${dayId}`;
}

export function parseCellKey(key: string): { rowId: string; dayId: string } | null {
  const index = key.indexOf('|');
  if (index <= 0 || index === key.length - 1) return null;
  return { rowId: key.slice(0, index), dayId: key.slice(index + 1) };
}

export function getCell(config: TimetableConfig, rowId: string, dayId: string): Cell | undefined {
  return config.cells[cellKey(rowId, dayId)];
}

export function isLessonRow(row: Row): row is LessonRow {
  return row.kind === 'lesson';
}

/** Beschriftung der Zeitspalte, z.B. "08:20 – 09:05". */
export function rowLabel(row: Row): string {
  if (row.kind === 'separator') return row.label;
  if (row.label) return row.label;
  return `${row.start} – ${row.end}`;
}

/** Eine gerenderte Zelle einer Lektionszeile. */
export interface LayoutCell {
  day: Day;
  dayIndex: number;
  cell: Cell | undefined;
  /** Anzahl Tagesspalten, die diese Zelle einnimmt (>= 1). */
  colSpan: number;
}

/**
 * Verteilt die Zellen einer Lektionszeile auf die Tagesspalten und löst Bänder
 * (`daySpan`) auf. Überdeckte Spalten tauchen im Ergebnis nicht auf — genau das
 * braucht sowohl `<td colSpan>` als auch die Drop-Logik.
 *
 * Widersprüchliche Daten (Band ragt über den letzten Tag hinaus, Band beginnt
 * innerhalb eines anderen Bandes) werden beim Rendern entschärft statt zu
 * einem kaputten Raster zu führen.
 */
export function rowLayout(config: TimetableConfig, rowId: string): LayoutCell[] {
  const layout: LayoutCell[] = [];
  const days = config.days;
  let coverUntil = 0;

  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    if (!day) continue;
    if (i < coverUntil) continue;

    const cell = getCell(config, rowId, day.id);
    const requested = cell?.daySpan ?? 1;
    const colSpan = Math.min(Math.max(Math.trunc(requested) || 1, 1), days.length - i);
    coverUntil = i + colSpan;
    layout.push({ day, dayIndex: i, cell, colSpan });
  }

  return layout;
}

/** Tage, die in dieser Zeile von einem Band einer anderen Spalte überdeckt werden. */
export function coveredDayIds(config: TimetableConfig, rowId: string): Set<string> {
  const visible = new Set(rowLayout(config, rowId).map((entry) => entry.day.id));
  const covered = new Set<string>();
  for (const day of config.days) {
    if (!visible.has(day.id)) covered.add(day.id);
  }
  return covered;
}

export function isCovered(config: TimetableConfig, rowId: string, dayId: string): boolean {
  return coveredDayIds(config, rowId).has(dayId);
}

/** Schlüssel der Zellen, die ein Band ab `dayId` überdeckt (ohne die Startzelle selbst). */
export function coveredKeys(
  config: TimetableConfig,
  rowId: string,
  dayId: string,
  span: number,
): string[] {
  const start = config.days.findIndex((day) => day.id === dayId);
  if (start < 0) return [];
  const keys: string[] = [];
  for (let i = start + 1; i < Math.min(start + span, config.days.length); i++) {
    const day = config.days[i];
    if (day) keys.push(cellKey(rowId, day.id));
  }
  return keys;
}

/**
 * Darf `dayId` in dieser Zeile über `span` Spalten laufen? Verhindert Bänder
 * über den Wochenrand hinaus und Bänder, die in einem anderen Band beginnen.
 */
export function canSetSpan(
  config: TimetableConfig,
  rowId: string,
  dayId: string,
  span: number,
): boolean {
  const row = config.rows.find((entry) => entry.id === rowId);
  if (!row || row.kind !== 'lesson') return false;
  if (!Number.isInteger(span) || span < 1) return false;

  const start = config.days.findIndex((day) => day.id === dayId);
  if (start < 0) return false;
  if (start + span > config.days.length) return false;

  // Die Startzelle darf nicht selbst von einem fremden Band überdeckt sein.
  return !isCovered(config, rowId, dayId);
}

/** Grösstmögliches Band ab dieser Zelle (bis zum Wochenende bzw. Rasterrand). */
export function maxSpan(config: TimetableConfig, rowId: string, dayId: string): number {
  const start = config.days.findIndex((day) => day.id === dayId);
  if (start < 0) return 1;
  if (isCovered(config, rowId, dayId)) return 1;
  return config.days.length - start;
}

/** Ist diese Zelle ein gültiges Ablageziel für Drag & Drop? */
export function isDroppable(config: TimetableConfig, rowId: string, dayId: string): boolean {
  const row = config.rows.find((entry) => entry.id === rowId);
  if (!row || row.kind !== 'lesson') return false;
  if (isCovered(config, rowId, dayId)) return false;
  return getCell(config, rowId, dayId)?.blocked !== true;
}

/** IDs der Lektionsarten, die tatsächlich im Raster vorkommen — in Rasterreihenfolge. */
export function usedLessonTypeIds(config: TimetableConfig): string[] {
  const used: string[] = [];
  const seen = new Set<string>();
  for (const row of config.rows) {
    if (row.kind !== 'lesson') continue;
    for (const entry of rowLayout(config, row.id)) {
      const id = entry.cell?.lessonTypeId;
      if (id && !seen.has(id)) {
        seen.add(id);
        used.push(id);
      }
    }
  }
  return used;
}
