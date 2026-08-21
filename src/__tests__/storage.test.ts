import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyConfig, createSampleConfig } from '../config/defaults';
import { clearWorkspace, loadWorkspace, saveWorkspace } from '../config/storage';

describe('Arbeitsbereich im localStorage', () => {
  beforeEach(() => {
    clearWorkspace();
  });

  it('liefert ohne gespeicherten Zustand die Startvorlage', () => {
    const workspace = loadWorkspace();
    expect(workspace.plans).toHaveLength(1);
    expect(workspace.plans[0]?.name).toBe('Halbklasse blau');
    expect(workspace.activeId).toBe(workspace.plans[0]?.id);
  });

  it('speichert und lädt mehrere Pläne', () => {
    const first = createSampleConfig();
    const second = createEmptyConfig('Zweiter');
    saveWorkspace({ activeId: second.id, plans: [first, second] });

    const loaded = loadWorkspace();
    expect(loaded.plans.map((plan) => plan.name)).toEqual(['Halbklasse blau', 'Zweiter']);
    expect(loaded.activeId).toBe(second.id);
  });

  it('fällt bei beschädigtem Inhalt auf die Startvorlage zurück', () => {
    window.localStorage.setItem('timetable-creator/workspace/v1', '{kein json');
    expect(loadWorkspace().plans).toHaveLength(1);

    window.localStorage.setItem('timetable-creator/workspace/v1', '{"plans":[{"nonsense":true}]}');
    expect(loadWorkspace().plans[0]?.name).toBe('Halbklasse blau');
  });

  it('korrigiert eine unbekannte aktive ID', () => {
    const plan = createSampleConfig();
    saveWorkspace({ activeId: 'gibtsnicht', plans: [plan] });
    expect(loadWorkspace().activeId).toBe(plan.id);
  });
});
