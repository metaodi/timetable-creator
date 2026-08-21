import { describe, expect, it } from 'vitest';
import { createSampleConfig } from '../config/defaults';
import {
  canSetSpan,
  cellKey,
  coveredDayIds,
  coveredKeys,
  isDroppable,
  maxSpan,
  parseCellKey,
  rowLabel,
  rowLayout,
  usedLessonTypeIds,
} from '../config/grid';
import type { TimetableConfig } from '../types/config';

function sample(): TimetableConfig {
  return createSampleConfig();
}

const MO = 'day_mo';
const DI = 'day_di';
const MI = 'day_mi';
const DO = 'day_do';
const FR = 'day_fr';
const BAND_ROW = 'row_0815';
const AFTERNOON_BAND_ROW = 'row_1335';
const NORMAL_ROW = 'row_0820';
const SEPARATOR_ROW = 'row_mittag';

describe('cellKey / parseCellKey', () => {
  it('ist ein Rundlauf', () => {
    expect(parseCellKey(cellKey('row_1', 'day_1'))).toEqual({ rowId: 'row_1', dayId: 'day_1' });
  });

  it('weist kaputte Schlüssel ab', () => {
    expect(parseCellKey('ohne-trenner')).toBeNull();
    expect(parseCellKey('|day')).toBeNull();
    expect(parseCellKey('row|')).toBeNull();
  });
});

describe('rowLayout', () => {
  it('fasst ein Band über die ganze Woche zu einer Zelle zusammen', () => {
    const layout = rowLayout(sample(), BAND_ROW);
    expect(layout).toHaveLength(1);
    expect(layout[0]?.day.id).toBe(MO);
    expect(layout[0]?.colSpan).toBe(5);
  });

  it('lässt normale Zeilen unangetastet', () => {
    const layout = rowLayout(sample(), NORMAL_ROW);
    expect(layout.map((entry) => entry.day.id)).toEqual([MO, DI, MI, DO, FR]);
    expect(layout.every((entry) => entry.colSpan === 1)).toBe(true);
  });

  it('trennt zwei Bänder um eine gesperrte Zelle herum', () => {
    const layout = rowLayout(sample(), AFTERNOON_BAND_ROW);
    expect(layout.map((entry) => [entry.day.id, entry.colSpan])).toEqual([
      [MO, 2],
      [MI, 1],
      [DO, 2],
    ]);
  });

  it('kürzt ein Band, das über den letzten Tag hinausragen würde', () => {
    const config = sample();
    config.cells[cellKey(NORMAL_ROW, FR)] = { lessonTypeId: 'lt_unterricht', daySpan: 4 };
    const layout = rowLayout(config, NORMAL_ROW);
    expect(layout.at(-1)).toMatchObject({ colSpan: 1 });
    expect(layout).toHaveLength(5);
  });

  it('ignoriert ein Band, das innerhalb eines anderen Bandes beginnt', () => {
    const config = sample();
    config.cells[cellKey(BAND_ROW, MI)] = { lessonTypeId: 'lt_tt', daySpan: 2 };
    expect(rowLayout(config, BAND_ROW)).toHaveLength(1);
  });
});

describe('coveredDayIds / coveredKeys', () => {
  it('meldet die vom Band überdeckten Tage', () => {
    expect([...coveredDayIds(sample(), BAND_ROW)]).toEqual([DI, MI, DO, FR]);
  });

  it('meldet für eine normale Zeile nichts', () => {
    expect(coveredDayIds(sample(), NORMAL_ROW).size).toBe(0);
  });

  it('liefert die Schlüssel der überdeckten Zellen ohne die Startzelle', () => {
    expect(coveredKeys(sample(), NORMAL_ROW, MO, 3)).toEqual([
      cellKey(NORMAL_ROW, DI),
      cellKey(NORMAL_ROW, MI),
    ]);
  });

  it('läuft nicht über den letzten Tag hinaus', () => {
    expect(coveredKeys(sample(), NORMAL_ROW, DO, 5)).toEqual([cellKey(NORMAL_ROW, FR)]);
  });
});

describe('canSetSpan / maxSpan', () => {
  it('erlaubt ein Band bis zum Wochenende', () => {
    expect(canSetSpan(sample(), NORMAL_ROW, MO, 5)).toBe(true);
    expect(maxSpan(sample(), NORMAL_ROW, MO)).toBe(5);
    expect(maxSpan(sample(), NORMAL_ROW, DO)).toBe(2);
  });

  it('verweigert ein Band über den Wochenrand hinaus', () => {
    expect(canSetSpan(sample(), NORMAL_ROW, DO, 3)).toBe(false);
  });

  it('verweigert ein Band, das in einem anderen Band beginnt', () => {
    expect(canSetSpan(sample(), BAND_ROW, MI, 2)).toBe(false);
    expect(maxSpan(sample(), BAND_ROW, MI)).toBe(1);
  });

  it('verweigert Bänder auf Trennzeilen und ungültige Werte', () => {
    expect(canSetSpan(sample(), SEPARATOR_ROW, MO, 2)).toBe(false);
    expect(canSetSpan(sample(), NORMAL_ROW, MO, 0)).toBe(false);
    expect(canSetSpan(sample(), NORMAL_ROW, MO, 1.5)).toBe(false);
    expect(canSetSpan(sample(), NORMAL_ROW, 'day_unbekannt', 2)).toBe(false);
  });
});

describe('isDroppable', () => {
  it('nimmt normale Zellen an', () => {
    expect(isDroppable(sample(), NORMAL_ROW, MO)).toBe(true);
  });

  it('lehnt gesperrte, überdeckte und Trennzeilen-Zellen ab', () => {
    expect(isDroppable(sample(), AFTERNOON_BAND_ROW, MI)).toBe(false);
    expect(isDroppable(sample(), BAND_ROW, DI)).toBe(false);
    expect(isDroppable(sample(), SEPARATOR_ROW, MO)).toBe(false);
  });
});

describe('rowLabel', () => {
  it('nutzt die Zeit, die eigene Beschriftung oder das Trennband', () => {
    const config = sample();
    const lesson = config.rows.find((row) => row.id === NORMAL_ROW);
    const separator = config.rows.find((row) => row.id === SEPARATOR_ROW);
    expect(lesson && rowLabel(lesson)).toBe('08:20 – 09:05');
    expect(separator && rowLabel(separator)).toBe('Mittagszeit');
    expect(rowLabel({ kind: 'lesson', id: 'x', start: '1', end: '2', label: 'Block 1' })).toBe(
      'Block 1',
    );
  });
});

describe('usedLessonTypeIds', () => {
  it('listet nur tatsächlich platzierte Arten, ohne Duplikate', () => {
    const used = usedLessonTypeIds(sample());
    expect(used).toContain('lt_unterricht');
    expect(used).toContain('lt_bs');
    // IF ist zwar definiert, kommt im Raster aber nicht vor.
    expect(used).not.toContain('lt_if');
    expect(new Set(used).size).toBe(used.length);
  });
});
