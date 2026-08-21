import { describe, expect, it } from 'vitest';
import { createSampleConfig } from '../config/defaults';
import { configToJson, suggestedFileName } from '../config/io';
import { migrateConfig, parseConfig } from '../config/schema';
import { SCHEMA_VERSION } from '../types/config';

describe('parseConfig', () => {
  it('überlebt den Export-Import-Rundlauf unverändert', () => {
    const config = createSampleConfig();
    const result = parseConfig(JSON.parse(configToJson(config)) as unknown);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.config).toEqual(config);
  });

  it('weist Nicht-Objekte und leere Pläne ab', () => {
    expect(parseConfig(null)).toMatchObject({ ok: false });
    expect(parseConfig([1, 2, 3])).toMatchObject({ ok: false });
    expect(parseConfig({ days: [], rows: [] })).toMatchObject({ ok: false });
    expect(parseConfig({ days: [{ id: 'd', label: 'Mo' }], rows: [] })).toMatchObject({ ok: false });
  });

  it('verwirft verwaiste Zellen und unbekannte Lektionsarten', () => {
    const result = parseConfig({
      days: [{ id: 'd1', label: 'Montag' }],
      rows: [{ kind: 'lesson', id: 'r1', start: '08:00', end: '08:45' }],
      lessonTypes: [{ id: 't1', abbreviation: 'A', name: 'A', display: 'text' }],
      cells: {
        'r1|d1': { lessonTypeId: 't1' },
        'r1|d_weg': { lessonTypeId: 't1' },
        'r_weg|d1': { lessonTypeId: 't1' },
        'r1|d1x': { lessonTypeId: 'unbekannt' },
        kaputt: { lessonTypeId: 't1' },
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(Object.keys(result.config.cells)).toEqual(['r1|d1']);
  });

  it('liest eine geteilte Zelle (1./2. Semester)', () => {
    const result = parseConfig({
      days: [{ id: 'd1', label: 'Montag' }],
      rows: [{ kind: 'lesson', id: 'r1', start: '08:00', end: '08:45' }],
      lessonTypes: [
        { id: 't1', abbreviation: 'A', name: 'A', display: 'text' },
        { id: 't2', abbreviation: 'B', name: 'B', display: 'text' },
      ],
      cells: {
        'r1|d1': {
          lessonTypeId: 't1',
          split: true,
          secondLessonTypeId: 't2',
          secondNote: 'Halle 2',
        },
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.cells['r1|d1']).toEqual({
        lessonTypeId: 't1',
        split: true,
        secondLessonTypeId: 't2',
        secondNote: 'Halle 2',
      });
    }
  });

  it('verwirft eine unbekannte Lektionsart in der zweiten Hälfte', () => {
    const result = parseConfig({
      days: [{ id: 'd1', label: 'Montag' }],
      rows: [{ kind: 'lesson', id: 'r1', start: '08:00', end: '08:45' }],
      lessonTypes: [{ id: 't1', abbreviation: 'A', name: 'A', display: 'text' }],
      cells: {
        'r1|d1': { split: true, secondLessonTypeId: 'unbekannt' },
      },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.cells['r1|d1']).toEqual({ split: true });
    }
  });

  it('lässt keine externen Bild-URLs zu', () => {
    const result = parseConfig({
      meta: { title: 'T', logoDataUrl: 'https://example.invalid/logo.png' },
      days: [{ id: 'd1', label: 'Montag' }],
      rows: [{ kind: 'lesson', id: 'r1', start: '08:00', end: '08:45' }],
      lessonTypes: [
        {
          id: 't1',
          abbreviation: 'A',
          name: 'A',
          display: 'image',
          icon: { kind: 'image', dataUrl: 'https://example.invalid/icon.png' },
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.meta.logoDataUrl).toBeUndefined();
      expect(result.config.lessonTypes[0]?.icon).toBeUndefined();
    }
  });

  it('ergänzt eine fehlende Schemaversion', () => {
    const raw = JSON.parse(configToJson(createSampleConfig())) as Record<string, unknown>;
    delete raw.schemaVersion;
    const result = parseConfig(raw);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.config.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('lehnt eine neuere Schemaversion mit klarer Meldung ab', () => {
    const result = parseConfig({ ...createSampleConfig(), schemaVersion: SCHEMA_VERSION + 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('neueren Version');
  });

  it('vergibt fehlende IDs neu, ohne Duplikate zu erzeugen', () => {
    const result = parseConfig({
      days: [{ label: 'Montag' }, { label: 'Dienstag' }],
      rows: [
        { kind: 'lesson', id: 'r1', start: '08:00', end: '08:45' },
        { kind: 'lesson', id: 'r1', start: '09:00', end: '09:45' },
      ],
      lessonTypes: [],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const rowIds = result.config.rows.map((row) => row.id);
      const dayIds = result.config.days.map((day) => day.id);
      expect(new Set(rowIds).size).toBe(2);
      expect(new Set(dayIds).size).toBe(2);
    }
  });
});

describe('migrateConfig', () => {
  it('hebt auf die aktuelle Version', () => {
    expect(migrateConfig({}).schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('wirft bei einer zu neuen Version', () => {
    expect(() => migrateConfig({ schemaVersion: 99 })).toThrow();
  });
});

describe('suggestedFileName', () => {
  it('macht aus dem Plannamen einen brauchbaren Dateinamen', () => {
    expect(suggestedFileName({ ...createSampleConfig(), name: 'Halbklasse blau' })).toBe(
      'halbklasse-blau.json',
    );
    expect(suggestedFileName({ ...createSampleConfig(), name: '2. Klasse Oeggisbüel' })).toBe(
      '2-klasse-oeggisbueel.json',
    );
    expect(suggestedFileName({ ...createSampleConfig(), name: '///' })).toBe('stundenplan.json');
  });
});
