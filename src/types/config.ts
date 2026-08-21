/**
 * Datenmodell des Stundenplans.
 *
 * Die Konfiguration ist die einzige Quelle der Wahrheit: die Oberfläche ist nur
 * eine Darstellung davon, und genau dieses Objekt wird als JSON exportiert.
 */

export const SCHEMA_VERSION = 1;

/** Ein Wochentag = eine Spalte des Rasters. */
export interface Day {
  id: string;
  label: string;
}

/** Eine Lektionszeile mit Zeitfenster, z.B. 08:20–09:05. */
export interface LessonRow {
  kind: 'lesson';
  id: string;
  /** "HH:MM" */
  start: string;
  /** "HH:MM" */
  end: string;
  /** Optionale Beschriftung statt der Zeit, z.B. "Block 1". */
  label?: string;
}

/** Ein Trennband über die volle Breite, z.B. "Mittagszeit". */
export interface SeparatorRow {
  kind: 'separator';
  id: string;
  label: string;
}

export type Row = LessonRow | SeparatorRow;

export type LessonIcon =
  | { kind: 'emoji'; value: string }
  | { kind: 'image'; dataUrl: string };

/** Wie eine Lektionsart in der Zelle dargestellt wird. */
export type LessonDisplay = 'text' | 'image' | 'both';

/** Eine Lektionsart, z.B. "BS – Bewegung und Sport". */
export interface LessonType {
  id: string;
  /** Kürzel in der Zelle, z.B. "BS". */
  abbreviation: string;
  /** Ausgeschriebenes Fach für die Legende, z.B. "Bewegung und Sport". */
  name: string;
  teacher?: string;
  location?: string;
  display: LessonDisplay;
  icon?: LessonIcon;
  /** Hintergrundfarbe der Zelle (CSS-Farbe). */
  color?: string;
  /** Standardmässig true; false z.B. für Bänder wie "Auffangzeit". */
  showInLegend?: boolean;
}

/** Inhalt einer Rasterzelle. */
export interface Cell {
  lessonTypeId?: string;
  /** Zusatz nur für diese Zelle, z.B. "(Feld)". */
  note?: string;
  /** Graue Zelle: kein Unterricht, nimmt nichts an. */
  blocked?: boolean;
  /** Anzahl überdeckter Tagesspalten (>= 2 ergibt ein Band). */
  daySpan?: number;
  /** Zelle in 1./2. Semester geteilt: links `lessonTypeId`/`note`, rechts die Felder unten. */
  split?: boolean;
  /** Lektionsart der zweiten Hälfte (2. Semester), nur wenn `split` gesetzt ist. */
  secondLessonTypeId?: string;
  /** Zusatz der zweiten Hälfte (2. Semester). */
  secondNote?: string;
}

/** Zusätzliche, manuell gepflegte Legendenzeile. */
export interface LegendEntry {
  id: string;
  abbreviation: string;
  name: string;
  teacher?: string;
  location?: string;
}

export interface TimetableConfig {
  schemaVersion: number;
  id: string;
  /** Name des Plans in der Planverwaltung. */
  name: string;
  meta: {
    title: string;
    subtitle: string;
    logoDataUrl?: string;
  };
  days: Day[];
  rows: Row[];
  lessonTypes: LessonType[];
  /** Schlüssel: `${rowId}|${dayId}` (siehe `cellKey`). */
  cells: Record<string, Cell>;
  legend: {
    visible: boolean;
    extraEntries: LegendEntry[];
  };
}
