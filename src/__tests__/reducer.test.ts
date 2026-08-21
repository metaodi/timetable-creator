import { describe, expect, it } from 'vitest';
import { createEmptyConfig, createSampleConfig } from '../config/defaults';
import { cellKey, getCell, rowLayout } from '../config/grid';
import type { Workspace } from '../config/storage';
import { activeConfig, configReducer, workspaceReducer, type Action } from '../state/reducer';
import type { TimetableConfig } from '../types/config';

const MO = 'day_mo';
const DI = 'day_di';
const MI = 'day_mi';
const DO = 'day_do';
const FR = 'day_fr';
const BAND_ROW = 'row_0815';
const AFTERNOON_BAND_ROW = 'row_1335';
const ROW_1 = 'row_0820';
const ROW_2 = 'row_0910';
const SEPARATOR_ROW = 'row_mittag';

function sample(): TimetableConfig {
  return createSampleConfig();
}

function apply(config: TimetableConfig, ...actions: Action[]): TimetableConfig {
  return actions.reduce(configReducer, config);
}

describe('placeLesson', () => {
  it('setzt eine Lektionsart in eine leere Zelle', () => {
    const next = apply(sample(), {
      type: 'placeLesson',
      target: { rowId: ROW_1, dayId: FR },
      lessonTypeId: 'lt_if',
    });
    expect(getCell(next, ROW_1, FR)?.lessonTypeId).toBe('lt_if');
  });

  it('lässt gesperrte Zellen unverändert', () => {
    const config = sample();
    const next = apply(config, {
      type: 'placeLesson',
      target: { rowId: AFTERNOON_BAND_ROW, dayId: MI },
      lessonTypeId: 'lt_if',
    });
    expect(next).toBe(config);
  });

  it('lässt überdeckte Zellen und Trennzeilen unverändert', () => {
    const config = sample();
    expect(
      apply(config, { type: 'placeLesson', target: { rowId: BAND_ROW, dayId: MI }, lessonTypeId: 'lt_if' }),
    ).toBe(config);
    expect(
      apply(config, {
        type: 'placeLesson',
        target: { rowId: SEPARATOR_ROW, dayId: MO },
        lessonTypeId: 'lt_if',
      }),
    ).toBe(config);
  });

  it('lehnt unbekannte Lektionsarten ab', () => {
    const config = sample();
    expect(
      apply(config, { type: 'placeLesson', target: { rowId: ROW_1, dayId: FR }, lessonTypeId: 'lt_x' }),
    ).toBe(config);
  });
});

describe('moveLesson', () => {
  it('verschiebt eine Lektion samt Zusatz in eine leere Zelle', () => {
    const next = apply(sample(), {
      type: 'moveLesson',
      from: { rowId: 'row_1435', dayId: MO },
      to: { rowId: ROW_1, dayId: FR },
    });
    expect(getCell(next, 'row_1435', MO)).toBeUndefined();
    expect(getCell(next, ROW_1, FR)).toEqual({
      lessonTypeId: 'lt_bs',
      note: '(Platte) / Schwimmen',
    });
  });

  it('tauscht zwei belegte Zellen', () => {
    const next = apply(sample(), {
      type: 'moveLesson',
      from: { rowId: ROW_1, dayId: DI }, // TTG
      to: { rowId: ROW_1, dayId: MO }, // Unterricht
    });
    expect(getCell(next, ROW_1, MO)?.lessonTypeId).toBe('lt_ttg');
    expect(getCell(next, ROW_1, DI)?.lessonTypeId).toBe('lt_unterricht');
  });

  it('lässt Sperre und Band an ihrer Position', () => {
    // ROW_1/MO wird zum Band, ROW_1/FR ist im Beispielplan leer.
    const config = apply(sample(), {
      type: 'setCellSpan',
      target: { rowId: ROW_1, dayId: MO },
      span: 2,
    });
    const next = apply(config, {
      type: 'moveLesson',
      from: { rowId: ROW_1, dayId: MO },
      to: { rowId: ROW_1, dayId: FR },
    });
    expect(getCell(next, ROW_1, MO)).toEqual({ daySpan: 2 });
    expect(getCell(next, ROW_1, FR)).toEqual({ lessonTypeId: 'lt_unterricht' });
  });

  it('verweigert das Ablegen auf gesperrten Zellen', () => {
    const config = sample();
    expect(
      apply(config, {
        type: 'moveLesson',
        from: { rowId: 'row_1340', dayId: MO },
        to: { rowId: 'row_1340', dayId: MI },
      }),
    ).toBe(config);
  });

  it('tut nichts, wenn die Ausgangszelle leer ist', () => {
    const config = sample();
    expect(
      apply(config, {
        type: 'moveLesson',
        from: { rowId: ROW_1, dayId: FR },
        to: { rowId: ROW_2, dayId: FR },
      }),
    ).toBe(config);
  });
});

describe('Zelleneigenschaften', () => {
  it('leert eine Zelle, behält aber die Sperre', () => {
    const config = apply(sample(), {
      type: 'setCellBlocked',
      target: { rowId: ROW_1, dayId: FR },
      blocked: true,
    });
    const next = apply(config, { type: 'clearCell', target: { rowId: ROW_1, dayId: FR } });
    expect(getCell(next, ROW_1, FR)).toEqual({ blocked: true });
  });

  it('entfernt beim Sperren Inhalt und Band', () => {
    const next = apply(sample(), {
      type: 'setCellBlocked',
      target: { rowId: BAND_ROW, dayId: MO },
      blocked: true,
    });
    expect(getCell(next, BAND_ROW, MO)).toEqual({ blocked: true });
    expect(rowLayout(next, BAND_ROW)).toHaveLength(5);
  });

  it('räumt beim Aufziehen eines Bandes die überdeckten Zellen', () => {
    const next = apply(sample(), {
      type: 'setCellSpan',
      target: { rowId: ROW_1, dayId: MO },
      span: 3,
    });
    expect(getCell(next, ROW_1, MO)?.daySpan).toBe(3);
    expect(getCell(next, ROW_1, DI)).toBeUndefined();
    expect(getCell(next, ROW_1, MI)).toBeUndefined();
    expect(getCell(next, ROW_1, DO)?.lessonTypeId).toBe('lt_unterricht');
  });

  it('verweigert ein zu breites Band', () => {
    const config = sample();
    expect(
      apply(config, { type: 'setCellSpan', target: { rowId: ROW_1, dayId: DO }, span: 3 }),
    ).toBe(config);
  });

  it('entfernt leere Zellen ganz aus der Konfiguration', () => {
    const next = apply(
      sample(),
      { type: 'clearCell', target: { rowId: ROW_1, dayId: MO } },
      { type: 'setCellNote', target: { rowId: ROW_1, dayId: MO }, note: '  ' },
    );
    expect(Object.hasOwn(next.cells, cellKey(ROW_1, MO))).toBe(false);
  });
});

describe('geteilte Zellen (1./2. Semester)', () => {
  it('setzt die zweite Hälfte und aktiviert dabei automatisch die Teilung', () => {
    const next = apply(sample(), {
      type: 'placeLessonSecond',
      target: { rowId: ROW_1, dayId: FR },
      lessonTypeId: 'lt_if',
    });
    expect(getCell(next, ROW_1, FR)).toEqual({ split: true, secondLessonTypeId: 'lt_if' });
  });

  it('behält die erste Hälfte, wenn nur die zweite gesetzt wird', () => {
    const next = apply(
      sample(),
      { type: 'setCellSplit', target: { rowId: ROW_1, dayId: MO }, split: true },
      { type: 'placeLessonSecond', target: { rowId: ROW_1, dayId: MO }, lessonTypeId: 'lt_if' },
    );
    const cell = getCell(next, ROW_1, MO);
    expect(cell?.lessonTypeId).toBe('lt_unterricht');
    expect(cell?.secondLessonTypeId).toBe('lt_if');
    expect(cell?.split).toBe(true);
  });

  it('löscht beim Ausschalten der Teilung die zweite Hälfte', () => {
    const config = apply(
      sample(),
      { type: 'placeLessonSecond', target: { rowId: ROW_1, dayId: MO }, lessonTypeId: 'lt_if' },
      { type: 'setCellNoteSecond', target: { rowId: ROW_1, dayId: MO }, note: 'Halle 2' },
    );
    const next = apply(config, { type: 'setCellSplit', target: { rowId: ROW_1, dayId: MO }, split: false });
    const cell = getCell(next, ROW_1, MO);
    expect(cell?.split).toBeUndefined();
    expect(cell?.secondLessonTypeId).toBeUndefined();
    expect(cell?.secondNote).toBeUndefined();
    expect(cell?.lessonTypeId).toBe('lt_unterricht');
  });

  it('leert nur die zweite Hälfte', () => {
    const config = apply(sample(), {
      type: 'placeLessonSecond',
      target: { rowId: ROW_1, dayId: MO },
      lessonTypeId: 'lt_if',
    });
    const next = apply(config, { type: 'clearCellSecond', target: { rowId: ROW_1, dayId: MO } });
    const cell = getCell(next, ROW_1, MO);
    expect(cell?.secondLessonTypeId).toBeUndefined();
    expect(cell?.lessonTypeId).toBe('lt_unterricht');
    expect(cell?.split).toBe(true);
  });

  it('lässt gesperrte Zellen unverändert', () => {
    const config = sample();
    expect(
      apply(config, {
        type: 'setCellSplit',
        target: { rowId: AFTERNOON_BAND_ROW, dayId: MI },
        split: true,
      }),
    ).toBe(config);
    expect(
      apply(config, {
        type: 'placeLessonSecond',
        target: { rowId: AFTERNOON_BAND_ROW, dayId: MI },
        lessonTypeId: 'lt_if',
      }),
    ).toBe(config);
  });

  it('räumt beim Sperren die Teilung mit auf', () => {
    const config = apply(sample(), {
      type: 'placeLessonSecond',
      target: { rowId: ROW_1, dayId: MO },
      lessonTypeId: 'lt_if',
    });
    const next = apply(config, {
      type: 'setCellBlocked',
      target: { rowId: ROW_1, dayId: MO },
      blocked: true,
    });
    expect(getCell(next, ROW_1, MO)).toEqual({ blocked: true });
  });

  it('entfernt eine Lektionsart auch aus der zweiten Hälfte', () => {
    const config = apply(sample(), {
      type: 'placeLessonSecond',
      target: { rowId: ROW_1, dayId: MO },
      lessonTypeId: 'lt_if',
    });
    const next = apply(config, { type: 'removeLessonType', lessonTypeId: 'lt_if' });
    const cell = getCell(next, ROW_1, MO);
    expect(cell?.secondLessonTypeId).toBeUndefined();
    expect(cell?.lessonTypeId).toBe('lt_unterricht');
  });
});

describe('Zeilen und Tage', () => {
  it('löscht mit einer Zeile auch deren Zellen', () => {
    const next = apply(sample(), { type: 'removeRow', rowId: ROW_1 });
    expect(next.rows.some((row) => row.id === ROW_1)).toBe(false);
    expect(Object.keys(next.cells).some((key) => key.startsWith(`${ROW_1}|`))).toBe(false);
  });

  it('löscht mit einem Tag auch dessen Zellen und kürzt Bänder', () => {
    const next = apply(sample(), { type: 'removeDay', dayId: FR });
    expect(next.days).toHaveLength(4);
    expect(Object.keys(next.cells).some((key) => key.endsWith(`|${FR}`))).toBe(false);
    // Das Wochenband lief über fünf Tage und passt jetzt nur noch über vier.
    expect(getCell(next, BAND_ROW, MO)?.daySpan).toBe(4);
  });

  it('behält die letzte Zeile bzw. den letzten Tag', () => {
    let config = createEmptyConfig();
    for (const row of [...config.rows]) config = apply(config, { type: 'removeRow', rowId: row.id });
    for (const day of [...config.days]) config = apply(config, { type: 'removeDay', dayId: day.id });
    expect(config.rows).toHaveLength(1);
    expect(config.days).toHaveLength(1);
  });

  it('verschiebt Zeilen und Tage', () => {
    const next = apply(
      sample(),
      { type: 'moveRow', rowId: ROW_1, direction: 1 },
      { type: 'moveDay', dayId: MO, direction: 1 },
    );
    expect(next.rows[1]?.id).toBe(ROW_2);
    expect(next.rows[2]?.id).toBe(ROW_1);
    expect(next.days[0]?.id).toBe(DI);
    expect(next.days[1]?.id).toBe(MO);
  });

  it('verschiebt nicht über den Rand hinaus', () => {
    const config = sample();
    expect(apply(config, { type: 'moveDay', dayId: MO, direction: -1 }).days).toEqual(config.days);
    expect(apply(config, { type: 'moveDay', dayId: FR, direction: 1 }).days).toEqual(config.days);
  });

  it('fügt eine Zeile nach der angegebenen ein', () => {
    const next = apply(sample(), { type: 'addRow', kind: 'lesson', afterRowId: ROW_1 });
    expect(next.rows[2]?.kind).toBe('lesson');
    expect(next.rows).toHaveLength(sample().rows.length + 1);
  });
});

describe('Lektionsarten', () => {
  it('entfernt eine Lektionsart samt ihrer Vorkommen im Raster', () => {
    const next = apply(sample(), { type: 'removeLessonType', lessonTypeId: 'lt_bs' });
    expect(next.lessonTypes.some((type) => type.id === 'lt_bs')).toBe(false);
    expect(Object.values(next.cells).some((cell) => cell.lessonTypeId === 'lt_bs')).toBe(false);
    // Die gesperrten Zellen bleiben erhalten.
    expect(getCell(next, AFTERNOON_BAND_ROW, MI)).toEqual({ blocked: true });
  });

  it('legt eine neue Art an und aktualisiert eine bestehende', () => {
    const created = apply(sample(), {
      type: 'upsertLessonType',
      lessonType: { id: 'lt_neu', abbreviation: 'NE', name: 'Neu', display: 'text' },
    });
    expect(created.lessonTypes.at(-1)?.id).toBe('lt_neu');

    const updated = apply(created, {
      type: 'upsertLessonType',
      lessonType: { id: 'lt_neu', abbreviation: 'NE', name: 'Umbenannt', display: 'text' },
    });
    expect(updated.lessonTypes).toHaveLength(created.lessonTypes.length);
    expect(updated.lessonTypes.at(-1)?.name).toBe('Umbenannt');
  });
});

describe('workspaceReducer', () => {
  function workspace(): Workspace {
    const plan = sample();
    return { activeId: plan.id, plans: [plan] };
  }

  it('wendet Raster-Aktionen nur auf den aktiven Plan an', () => {
    const second = createEmptyConfig('Zweiter');
    let state = workspaceReducer(workspace(), { type: 'addPlan', config: second });
    expect(state.activeId).toBe(second.id);

    state = workspaceReducer(state, {
      type: 'placeLesson',
      target: { rowId: second.rows[0]!.id, dayId: second.days[0]!.id },
      lessonTypeId: second.lessonTypes[0]!.id,
    });

    expect(Object.keys(activeConfig(state).cells)).toHaveLength(1);
    expect(Object.keys(state.plans[0]!.cells)).toHaveLength(Object.keys(sample().cells).length);
  });

  it('dupliziert einen Plan mit neuer ID', () => {
    const before = workspace();
    const state = workspaceReducer(before, { type: 'duplicatePlan', planId: before.activeId });
    expect(state.plans).toHaveLength(2);
    expect(state.plans[1]?.id).not.toBe(state.plans[0]?.id);
    expect(state.plans[1]?.name).toContain('Kopie');
    expect(state.activeId).toBe(state.plans[1]?.id);
  });

  it('löscht den letzten Plan nicht', () => {
    const state = workspace();
    expect(workspaceReducer(state, { type: 'removePlan', planId: state.activeId })).toBe(state);
  });

  it('wählt nach dem Löschen des aktiven Plans einen verbleibenden', () => {
    let state = workspaceReducer(workspace(), { type: 'addPlan', config: createEmptyConfig() });
    const removedId = state.activeId;
    state = workspaceReducer(state, { type: 'removePlan', planId: removedId });
    expect(state.plans).toHaveLength(1);
    expect(state.activeId).not.toBe(removedId);
    expect(activeConfig(state)).toBe(state.plans[0]);
  });

  it('ignoriert die Auswahl eines unbekannten Plans', () => {
    const state = workspace();
    expect(workspaceReducer(state, { type: 'selectPlan', planId: 'gibtsnicht' })).toBe(state);
  });
});
