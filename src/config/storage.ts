import type { TimetableConfig } from '../types/config';
import { createSampleConfig } from './defaults';
import { parseConfig } from './schema';

const STORAGE_KEY = 'timetable-creator/workspace/v1';

export interface Workspace {
  activeId: string;
  plans: TimetableConfig[];
}

function firstPlanId(plans: TimetableConfig[]): string {
  return plans[0]?.id ?? '';
}

export function createInitialWorkspace(): Workspace {
  const sample = createSampleConfig();
  return { activeId: sample.id, plans: [sample] };
}

/**
 * Lädt den Arbeitsbereich aus dem localStorage. Jeder Plan läuft durch
 * `parseConfig`, damit alte oder beschädigte Einträge nicht die App blockieren.
 */
export function loadWorkspace(): Workspace {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Privater Modus o.ä. — dann eben ohne Persistenz.
    return createInitialWorkspace();
  }
  if (!raw) return createInitialWorkspace();

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return createInitialWorkspace();
    const candidate = parsed as { activeId?: unknown; plans?: unknown };
    const plans: TimetableConfig[] = [];
    if (Array.isArray(candidate.plans)) {
      for (const entry of candidate.plans) {
        const result = parseConfig(entry);
        if (result.ok) plans.push(result.config);
      }
    }
    if (plans.length === 0) return createInitialWorkspace();

    const activeId =
      typeof candidate.activeId === 'string' && plans.some((plan) => plan.id === candidate.activeId)
        ? candidate.activeId
        : firstPlanId(plans);
    return { activeId, plans };
  } catch {
    return createInitialWorkspace();
  }
}

export function saveWorkspace(workspace: Workspace): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
  } catch {
    // Speicher voll oder gesperrt: Der Nutzer kann weiterarbeiten und exportieren.
  }
}

export function clearWorkspace(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignorieren
  }
}
