import {
  cellKey,
  canSetSpan,
  coveredKeys,
  getCell,
  isCovered,
  parseCellKey,
} from '../config/grid';
import { newId } from '../config/ids';
import type { Workspace } from '../config/storage';
import type {
  Cell,
  Day,
  LegendEntry,
  LessonRow,
  LessonType,
  Row,
  SeparatorRow,
  TimetableConfig,
} from '../types/config';

export interface CellRef {
  rowId: string;
  dayId: string;
}

export type Action =
  // Raster
  | { type: 'placeLesson'; target: CellRef; lessonTypeId: string }
  | { type: 'moveLesson'; from: CellRef; to: CellRef }
  | { type: 'clearCell'; target: CellRef }
  | { type: 'setCellNote'; target: CellRef; note: string }
  | { type: 'setCellBlocked'; target: CellRef; blocked: boolean }
  | { type: 'setCellSpan'; target: CellRef; span: number }
  // Kopfbereich
  | { type: 'setMeta'; patch: Partial<TimetableConfig['meta']> }
  | { type: 'setPlanName'; name: string }
  // Zeilen
  | { type: 'addRow'; kind: Row['kind']; afterRowId?: string }
  | { type: 'updateRow'; rowId: string; patch: Partial<Omit<LessonRow, 'kind' | 'id'>> & Partial<Omit<SeparatorRow, 'kind' | 'id'>> }
  | { type: 'removeRow'; rowId: string }
  | { type: 'moveRow'; rowId: string; direction: -1 | 1 }
  // Tage
  | { type: 'addDay'; label: string }
  | { type: 'updateDay'; dayId: string; label: string }
  | { type: 'removeDay'; dayId: string }
  | { type: 'moveDay'; dayId: string; direction: -1 | 1 }
  // Lektionsarten
  | { type: 'upsertLessonType'; lessonType: LessonType }
  | { type: 'removeLessonType'; lessonTypeId: string }
  | { type: 'moveLessonType'; lessonTypeId: string; direction: -1 | 1 }
  // Legende
  | { type: 'setLegendVisible'; visible: boolean }
  | { type: 'addLegendEntry' }
  | { type: 'updateLegendEntry'; entryId: string; patch: Partial<Omit<LegendEntry, 'id'>> }
  | { type: 'removeLegendEntry'; entryId: string }
  // Planverwaltung
  | { type: 'selectPlan'; planId: string }
  | { type: 'addPlan'; config: TimetableConfig }
  | { type: 'duplicatePlan'; planId: string }
  | { type: 'removePlan'; planId: string }
  | { type: 'replaceActivePlan'; config: TimetableConfig };

// ---------------------------------------------------------------- Hilfsmittel

function isEmptyCell(cell: Cell): boolean {
  return (
    cell.lessonTypeId === undefined &&
    cell.note === undefined &&
    cell.blocked !== true &&
    (cell.daySpan === undefined || cell.daySpan <= 1)
  );
}

/** Setzt eine Zelle; leere Zellen verschwinden aus der Konfiguration. */
function withCell(config: TimetableConfig, ref: CellRef, cell: Cell): TimetableConfig {
  const key = cellKey(ref.rowId, ref.dayId);
  const cells = { ...config.cells };
  if (isEmptyCell(cell)) delete cells[key];
  else cells[key] = cell;
  return { ...config, cells };
}

function withoutCellKeys(config: TimetableConfig, keys: Iterable<string>): TimetableConfig {
  const cells = { ...config.cells };
  for (const key of keys) delete cells[key];
  return { ...config, cells };
}

/** Kürzt Bänder, die nach Umbau der Tagesspalten nicht mehr passen. */
function normalizeSpans(config: TimetableConfig): TimetableConfig {
  const cells = { ...config.cells };
  let changed = false;
  for (const [key, cell] of Object.entries(cells)) {
    if (!cell.daySpan || cell.daySpan <= 1) continue;
    const ref = parseCellKey(key);
    if (!ref) continue;
    const index = config.days.findIndex((day) => day.id === ref.dayId);
    if (index < 0) continue;
    const max = config.days.length - index;
    if (cell.daySpan <= max) continue;
    const next: Cell = { ...cell };
    if (max > 1) next.daySpan = max;
    else delete next.daySpan;
    cells[key] = next;
    changed = true;
  }
  return changed ? { ...config, cells } : config;
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (index < 0 || target < 0 || target >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(index, 1);
  if (item === undefined) return items;
  next.splice(target, 0, item);
  return next;
}

function isLessonCellTarget(config: TimetableConfig, ref: CellRef): boolean {
  const row = config.rows.find((entry) => entry.id === ref.rowId);
  if (!row || row.kind !== 'lesson') return false;
  if (!config.days.some((day) => day.id === ref.dayId)) return false;
  return !isCovered(config, ref.rowId, ref.dayId);
}

// ------------------------------------------------------------- Config-Reducer

/** Alle Aktionen, die nur den aktiven Plan betreffen. */
export function configReducer(config: TimetableConfig, action: Action): TimetableConfig {
  switch (action.type) {
    case 'placeLesson': {
      if (!isLessonCellTarget(config, action.target)) return config;
      const current = getCell(config, action.target.rowId, action.target.dayId);
      if (current?.blocked) return config;
      if (!config.lessonTypes.some((type) => type.id === action.lessonTypeId)) return config;
      return withCell(config, action.target, { ...current, lessonTypeId: action.lessonTypeId });
    }

    case 'moveLesson': {
      const { from, to } = action;
      if (from.rowId === to.rowId && from.dayId === to.dayId) return config;
      if (!isLessonCellTarget(config, from) || !isLessonCellTarget(config, to)) return config;

      const source = getCell(config, from.rowId, from.dayId);
      const target = getCell(config, to.rowId, to.dayId);
      if (!source?.lessonTypeId) return config;
      if (target?.blocked) return config;

      // Inhalt wandert, Bänder und Sperren bleiben an ihrer Position.
      const nextSource: Cell = { ...source };
      delete nextSource.lessonTypeId;
      delete nextSource.note;
      if (target?.lessonTypeId) nextSource.lessonTypeId = target.lessonTypeId;
      if (target?.note) nextSource.note = target.note;

      const nextTarget: Cell = { ...target, lessonTypeId: source.lessonTypeId };
      if (source.note) nextTarget.note = source.note;
      else delete nextTarget.note;

      return withCell(withCell(config, from, nextSource), to, nextTarget);
    }

    case 'clearCell': {
      const current = getCell(config, action.target.rowId, action.target.dayId);
      if (!current) return config;
      const next: Cell = { ...current };
      delete next.lessonTypeId;
      delete next.note;
      return withCell(config, action.target, next);
    }

    case 'setCellNote': {
      const current = getCell(config, action.target.rowId, action.target.dayId) ?? {};
      const next: Cell = { ...current };
      const note = action.note.trim();
      if (note) next.note = note;
      else delete next.note;
      return withCell(config, action.target, next);
    }

    case 'setCellBlocked': {
      if (!isLessonCellTarget(config, action.target)) return config;
      const current = getCell(config, action.target.rowId, action.target.dayId) ?? {};
      const next: Cell = { ...current };
      if (action.blocked) {
        next.blocked = true;
        // Eine gesperrte Zelle hat weder Inhalt noch Band.
        delete next.lessonTypeId;
        delete next.note;
        delete next.daySpan;
      } else {
        delete next.blocked;
      }
      return withCell(config, action.target, next);
    }

    case 'setCellSpan': {
      const { target, span } = action;
      if (!canSetSpan(config, target.rowId, target.dayId, span)) return config;
      const current = getCell(config, target.rowId, target.dayId) ?? {};
      const next: Cell = { ...current };
      if (span > 1) next.daySpan = span;
      else delete next.daySpan;
      // Überdeckte Zellen verlieren ihren Inhalt, sonst taucht er beim
      // Verkleinern des Bandes unerwartet wieder auf.
      const cleared = withoutCellKeys(config, coveredKeys(config, target.rowId, target.dayId, span));
      return withCell(cleared, target, next);
    }

    case 'setMeta':
      return { ...config, meta: { ...config.meta, ...action.patch } };

    case 'setPlanName':
      return { ...config, name: action.name };

    case 'addRow': {
      const row: Row =
        action.kind === 'separator'
          ? { kind: 'separator', id: newId('row'), label: 'Pause' }
          : { kind: 'lesson', id: newId('row'), start: '00:00', end: '00:45' };
      const index = action.afterRowId
        ? config.rows.findIndex((entry) => entry.id === action.afterRowId)
        : -1;
      const rows = [...config.rows];
      rows.splice(index >= 0 ? index + 1 : rows.length, 0, row);
      return { ...config, rows };
    }

    case 'updateRow': {
      const rows = config.rows.map((row) => {
        if (row.id !== action.rowId) return row;
        if (row.kind === 'separator') {
          return { ...row, label: action.patch.label ?? row.label } satisfies SeparatorRow;
        }
        const next: LessonRow = {
          ...row,
          start: action.patch.start ?? row.start,
          end: action.patch.end ?? row.end,
        };
        if (action.patch.label !== undefined) {
          if (action.patch.label.trim()) next.label = action.patch.label;
          else delete next.label;
        }
        return next;
      });
      return { ...config, rows };
    }

    case 'removeRow': {
      if (config.rows.length <= 1) return config;
      const rows = config.rows.filter((row) => row.id !== action.rowId);
      if (rows.length === config.rows.length) return config;
      const orphans = Object.keys(config.cells).filter(
        (key) => parseCellKey(key)?.rowId === action.rowId,
      );
      return withoutCellKeys({ ...config, rows }, orphans);
    }

    case 'moveRow': {
      const index = config.rows.findIndex((row) => row.id === action.rowId);
      return { ...config, rows: moveItem(config.rows, index, action.direction) };
    }

    case 'addDay': {
      const label = action.label.trim() || 'Neuer Tag';
      return { ...config, days: [...config.days, { id: newId('day'), label }] };
    }

    case 'updateDay': {
      const days = config.days.map((day) =>
        day.id === action.dayId ? ({ ...day, label: action.label } satisfies Day) : day,
      );
      return { ...config, days };
    }

    case 'removeDay': {
      if (config.days.length <= 1) return config;
      const days = config.days.filter((day) => day.id !== action.dayId);
      if (days.length === config.days.length) return config;
      const orphans = Object.keys(config.cells).filter(
        (key) => parseCellKey(key)?.dayId === action.dayId,
      );
      return normalizeSpans(withoutCellKeys({ ...config, days }, orphans));
    }

    case 'moveDay': {
      const index = config.days.findIndex((day) => day.id === action.dayId);
      const days = moveItem(config.days, index, action.direction);
      return normalizeSpans({ ...config, days });
    }

    case 'upsertLessonType': {
      const exists = config.lessonTypes.some((type) => type.id === action.lessonType.id);
      const lessonTypes = exists
        ? config.lessonTypes.map((type) =>
            type.id === action.lessonType.id ? action.lessonType : type,
          )
        : [...config.lessonTypes, action.lessonType];
      return { ...config, lessonTypes };
    }

    case 'removeLessonType': {
      const lessonTypes = config.lessonTypes.filter((type) => type.id !== action.lessonTypeId);
      if (lessonTypes.length === config.lessonTypes.length) return config;
      const cells: Record<string, Cell> = {};
      for (const [key, cell] of Object.entries(config.cells)) {
        if (cell.lessonTypeId !== action.lessonTypeId) {
          cells[key] = cell;
          continue;
        }
        const next: Cell = { ...cell };
        delete next.lessonTypeId;
        delete next.note;
        if (!isEmptyCell(next)) cells[key] = next;
      }
      return { ...config, lessonTypes, cells };
    }

    case 'moveLessonType': {
      const index = config.lessonTypes.findIndex((type) => type.id === action.lessonTypeId);
      return { ...config, lessonTypes: moveItem(config.lessonTypes, index, action.direction) };
    }

    case 'setLegendVisible':
      return { ...config, legend: { ...config.legend, visible: action.visible } };

    case 'addLegendEntry': {
      const entry: LegendEntry = { id: newId('leg'), abbreviation: '', name: '' };
      return {
        ...config,
        legend: { ...config.legend, extraEntries: [...config.legend.extraEntries, entry] },
      };
    }

    case 'updateLegendEntry': {
      const extraEntries = config.legend.extraEntries.map((entry) =>
        entry.id === action.entryId ? { ...entry, ...action.patch } : entry,
      );
      return { ...config, legend: { ...config.legend, extraEntries } };
    }

    case 'removeLegendEntry': {
      const extraEntries = config.legend.extraEntries.filter(
        (entry) => entry.id !== action.entryId,
      );
      return { ...config, legend: { ...config.legend, extraEntries } };
    }

    default:
      return config;
  }
}

// ---------------------------------------------------------- Workspace-Reducer

const PLAN_ACTIONS: ReadonlySet<Action['type']> = new Set([
  'selectPlan',
  'addPlan',
  'duplicatePlan',
  'removePlan',
  'replaceActivePlan',
]);

export function workspaceReducer(state: Workspace, action: Action): Workspace {
  switch (action.type) {
    case 'selectPlan':
      if (!state.plans.some((plan) => plan.id === action.planId)) return state;
      return { ...state, activeId: action.planId };

    case 'addPlan':
      return { activeId: action.config.id, plans: [...state.plans, action.config] };

    case 'duplicatePlan': {
      const source = state.plans.find((plan) => plan.id === action.planId);
      if (!source) return state;
      const copy: TimetableConfig = {
        ...structuredClone(source),
        id: newId('plan'),
        name: `${source.name} (Kopie)`,
      };
      return { activeId: copy.id, plans: [...state.plans, copy] };
    }

    case 'removePlan': {
      if (state.plans.length <= 1) return state;
      const plans = state.plans.filter((plan) => plan.id !== action.planId);
      if (plans.length === state.plans.length) return state;
      const activeId = plans.some((plan) => plan.id === state.activeId)
        ? state.activeId
        : (plans[0]?.id ?? '');
      return { activeId, plans };
    }

    case 'replaceActivePlan': {
      const plans = state.plans.map((plan) =>
        plan.id === state.activeId ? { ...action.config, id: state.activeId } : plan,
      );
      return { ...state, plans };
    }

    default: {
      if (PLAN_ACTIONS.has(action.type)) return state;
      const plans = state.plans.map((plan) =>
        plan.id === state.activeId ? configReducer(plan, action) : plan,
      );
      return { ...state, plans };
    }
  }
}

export function activeConfig(state: Workspace): TimetableConfig {
  const found = state.plans.find((plan) => plan.id === state.activeId);
  if (found) return found;
  const first = state.plans[0];
  if (!first) throw new Error('Der Arbeitsbereich enthält keinen Stundenplan.');
  return first;
}
