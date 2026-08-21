import { SCHEMA_VERSION, type Cell, type TimetableConfig } from '../types/config';
import { cellKey } from './grid';
import { newId } from './ids';

/**
 * Startvorlage nach dem Vorbild eines Halbklassen-Stundenplans.
 * Sie zeigt alle Bausteine — Bänder über mehrere Tage, Trennzeilen, gesperrte
 * Zellen, Bild- und Text-Lektionen — und dient zugleich als Testfixture.
 *
 * Die Lehrpersonen sind bewusst Platzhalter: diese Datei wird öffentlich
 * ausgeliefert. Echte Namen gehören in den eigenen Plan, der nur im Browser
 * des Nutzers liegt.
 */

const DAY = {
  mo: 'day_mo',
  di: 'day_di',
  mi: 'day_mi',
  do: 'day_do',
  fr: 'day_fr',
} as const;

const ROW = {
  auffangVormittag: 'row_0815',
  l1: 'row_0820',
  l2: 'row_0910',
  l3: 'row_1025',
  l4: 'row_1115',
  mittag: 'row_mittag',
  auffangNachmittag: 'row_1335',
  l5: 'row_1340',
  l6: 'row_1435',
} as const;

const TYPE = {
  unterricht: 'lt_unterricht',
  auffangzeit: 'lt_auffangzeit',
  if: 'lt_if',
  tt: 'lt_tt',
  ttg: 'lt_ttg',
  bs: 'lt_bs',
  schwimmen: 'lt_schwimmen',
  mga: 'lt_mga',
} as const;

function cells(entries: Array<[row: string, day: string, cell: Cell]>): Record<string, Cell> {
  const result: Record<string, Cell> = {};
  for (const [row, day, cell] of entries) {
    result[cellKey(row, day)] = cell;
  }
  return result;
}

export function createSampleConfig(): TimetableConfig {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: newId('plan'),
    name: 'Halbklasse blau',
    meta: {
      title: 'Stundenplan – Halbklasse blau',
      subtitle: 'Schuljahr 2026/2027, Schulhaus Oeggisbüel, 2. Klasse',
    },
    days: [
      { id: DAY.mo, label: 'Montag' },
      { id: DAY.di, label: 'Dienstag' },
      { id: DAY.mi, label: 'Mittwoch' },
      { id: DAY.do, label: 'Donnerstag' },
      { id: DAY.fr, label: 'Freitag' },
    ],
    rows: [
      { kind: 'lesson', id: ROW.auffangVormittag, start: '08:15', end: '08:20' },
      { kind: 'lesson', id: ROW.l1, start: '08:20', end: '09:05' },
      { kind: 'lesson', id: ROW.l2, start: '09:10', end: '09:55' },
      { kind: 'lesson', id: ROW.l3, start: '10:25', end: '11:10' },
      { kind: 'lesson', id: ROW.l4, start: '11:15', end: '12:00' },
      { kind: 'separator', id: ROW.mittag, label: 'Mittagszeit' },
      { kind: 'lesson', id: ROW.auffangNachmittag, start: '13:35', end: '13:40' },
      { kind: 'lesson', id: ROW.l5, start: '13:40', end: '14:25' },
      { kind: 'lesson', id: ROW.l6, start: '14:35', end: '15:20' },
    ],
    lessonTypes: [
      {
        id: TYPE.unterricht,
        abbreviation: 'Unterricht',
        name: 'Unterricht',
        teacher: 'Klassenlehrperson',
        location: 'Schulhaus Oeggisbüel, Zimmer 11',
        display: 'image',
        icon: { kind: 'emoji', value: '🧙' },
        color: '#e8f1fb',
      },
      {
        id: TYPE.auffangzeit,
        abbreviation: 'Auffangzeit',
        name: 'Auffangzeit',
        display: 'text',
        color: '#f1f5f9',
        showInLegend: false,
      },
      {
        id: TYPE.if,
        abbreviation: 'IF',
        name: 'Integrative Förderung',
        teacher: 'Fachlehrperson IF',
        location: 'Schulhaus Oeggisbüel',
        display: 'text',
        color: '#fef3c7',
      },
      {
        id: TYPE.tt,
        abbreviation: 'TT',
        name: 'Team-Teaching',
        teacher: 'Fachlehrperson TT',
        location: 'Schulhaus Oeggisbüel',
        display: 'text',
        color: '#ede9fe',
      },
      {
        id: TYPE.ttg,
        abbreviation: 'TTG',
        name: 'Textiles und Technisches Gestalten',
        teacher: 'Fachlehrperson TTG',
        location: 'Schulhaus Oeggisbüel, Zimmer 2',
        display: 'text',
        icon: { kind: 'emoji', value: '✂️' },
        color: '#fce7f3',
      },
      {
        id: TYPE.bs,
        abbreviation: 'BS',
        name: 'Bewegung und Sport',
        teacher: 'Klassenlehrperson',
        location: 'Turnhalle Platte (Montag), Turnhalle Feld (Mittwoch)',
        display: 'text',
        icon: { kind: 'emoji', value: '⚽' },
        color: '#dcfce7',
      },
      {
        id: TYPE.schwimmen,
        abbreviation: 'Schwimmen',
        name: 'Schwimmen',
        teacher: 'Fachlehrperson Schwimmen',
        location: 'Hallenbad Schweikrüti',
        display: 'text',
        icon: { kind: 'emoji', value: '🏊' },
        color: '#cffafe',
      },
      {
        id: TYPE.mga,
        abbreviation: 'MGA',
        name: 'Musikalische Grundausbildung',
        teacher: 'vakant',
        location: 'Schulhaus Oelwiese, Singsaal',
        display: 'text',
        icon: { kind: 'emoji', value: '🎵' },
        color: '#ffedd5',
      },
    ],
    cells: cells([
      // Auffangzeit als Band über die ganze Woche.
      [ROW.auffangVormittag, DAY.mo, { lessonTypeId: TYPE.auffangzeit, daySpan: 5 }],

      [ROW.l1, DAY.mo, { lessonTypeId: TYPE.unterricht }],
      [ROW.l1, DAY.di, { lessonTypeId: TYPE.ttg }],
      [ROW.l1, DAY.mi, { lessonTypeId: TYPE.unterricht }],
      [ROW.l1, DAY.do, { lessonTypeId: TYPE.unterricht }],

      [ROW.l2, DAY.mo, { lessonTypeId: TYPE.unterricht }],
      [ROW.l2, DAY.di, { lessonTypeId: TYPE.ttg }],
      [ROW.l2, DAY.mi, { lessonTypeId: TYPE.unterricht }],
      [ROW.l2, DAY.do, { lessonTypeId: TYPE.tt }],
      [ROW.l2, DAY.fr, { lessonTypeId: TYPE.unterricht }],

      [ROW.l3, DAY.mo, { lessonTypeId: TYPE.unterricht }],
      [ROW.l3, DAY.di, { lessonTypeId: TYPE.unterricht }],
      [ROW.l3, DAY.mi, { lessonTypeId: TYPE.bs, note: '(Feld)' }],
      [ROW.l3, DAY.do, { lessonTypeId: TYPE.mga }],
      [ROW.l3, DAY.fr, { lessonTypeId: TYPE.unterricht }],

      [ROW.l4, DAY.mo, { lessonTypeId: TYPE.unterricht }],
      [ROW.l4, DAY.di, { lessonTypeId: TYPE.unterricht }],
      [ROW.l4, DAY.mi, { lessonTypeId: TYPE.bs, note: '(Feld)' }],
      [ROW.l4, DAY.do, { lessonTypeId: TYPE.unterricht }],
      [ROW.l4, DAY.fr, { lessonTypeId: TYPE.unterricht }],

      // Nachmittag: Mittwoch ist frei, deshalb zwei getrennte Auffangzeit-Bänder.
      [ROW.auffangNachmittag, DAY.mo, { lessonTypeId: TYPE.auffangzeit, daySpan: 2 }],
      [ROW.auffangNachmittag, DAY.mi, { blocked: true }],
      [ROW.auffangNachmittag, DAY.do, { lessonTypeId: TYPE.auffangzeit, daySpan: 2 }],

      [ROW.l5, DAY.mo, { lessonTypeId: TYPE.unterricht }],
      [ROW.l5, DAY.di, { lessonTypeId: TYPE.unterricht }],
      [ROW.l5, DAY.mi, { blocked: true }],
      [ROW.l5, DAY.fr, { lessonTypeId: TYPE.unterricht }],

      [ROW.l6, DAY.mo, { lessonTypeId: TYPE.bs, note: '(Platte) / Schwimmen' }],
      [ROW.l6, DAY.di, { lessonTypeId: TYPE.unterricht }],
      [ROW.l6, DAY.mi, { blocked: true }],
      [ROW.l6, DAY.fr, { lessonTypeId: TYPE.unterricht }],
    ]),
    legend: {
      visible: true,
      extraEntries: [
        {
          id: 'leg_assistenz',
          abbreviation: 'Klassenassistenz',
          name: '',
          teacher: 'Assistenzperson',
          location: 'Schulhaus Oeggisbüel, Zimmer 11',
        },
      ],
    },
  };
}

/** Leerer Plan: Mo–Fr, sechs Lektionen, ohne Inhalte. */
export function createEmptyConfig(name = 'Neuer Stundenplan'): TimetableConfig {
  const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'].map((label) => ({
    id: newId('day'),
    label,
  }));
  const times: Array<[string, string]> = [
    ['08:20', '09:05'],
    ['09:10', '09:55'],
    ['10:25', '11:10'],
    ['11:15', '12:00'],
  ];
  const afternoon: Array<[string, string]> = [
    ['13:40', '14:25'],
    ['14:35', '15:20'],
  ];

  return {
    schemaVersion: SCHEMA_VERSION,
    id: newId('plan'),
    name,
    meta: { title: name, subtitle: '' },
    days,
    rows: [
      ...times.map(([start, end]) => ({ kind: 'lesson' as const, id: newId('row'), start, end })),
      { kind: 'separator' as const, id: newId('row'), label: 'Mittagszeit' },
      ...afternoon.map(([start, end]) => ({ kind: 'lesson' as const, id: newId('row'), start, end })),
    ],
    lessonTypes: [
      {
        id: newId('lt'),
        abbreviation: 'Unterricht',
        name: 'Unterricht',
        display: 'text',
        color: '#e8f1fb',
      },
    ],
    cells: {},
    legend: { visible: true, extraEntries: [] },
  };
}
