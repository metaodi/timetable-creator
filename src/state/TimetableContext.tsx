import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from 'react';
import { loadWorkspace, saveWorkspace, type Workspace } from '../config/storage';
import type { TimetableConfig } from '../types/config';
import { activeConfig, workspaceReducer, type Action } from './reducer';

interface TimetableContextValue {
  workspace: Workspace;
  config: TimetableConfig;
  dispatch: Dispatch<Action>;
}

const TimetableContext = createContext<TimetableContextValue | null>(null);

const AUTOSAVE_DELAY_MS = 400;

export function TimetableProvider({
  children,
  initialWorkspace,
}: {
  children: ReactNode;
  /** Nur für Tests/Storybook — normalerweise kommt der Zustand aus dem localStorage. */
  initialWorkspace?: Workspace;
}) {
  const [workspace, dispatch] = useReducer(
    workspaceReducer,
    initialWorkspace,
    (initial) => initial ?? loadWorkspace(),
  );

  // Automatisches Speichern, gebündelt: beim Tippen sonst pro Anschlag ein Schreibvorgang.
  useEffect(() => {
    const timer = window.setTimeout(() => saveWorkspace(workspace), AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [workspace]);

  // Wer den Tab direkt nach einer Änderung schliesst, soll sie trotzdem behalten:
  // beim Verlassen der Seite wird der letzte Stand sofort geschrieben.
  const latest = useRef(workspace);
  latest.current = workspace;
  useEffect(() => {
    const flush = () => saveWorkspace(latest.current);
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flush);
    };
  }, []);

  const value = useMemo<TimetableContextValue>(
    () => ({ workspace, config: activeConfig(workspace), dispatch }),
    [workspace],
  );

  return <TimetableContext.Provider value={value}>{children}</TimetableContext.Provider>;
}

export function useTimetable(): TimetableContextValue {
  const value = useContext(TimetableContext);
  if (!value) throw new Error('useTimetable muss innerhalb von <TimetableProvider> genutzt werden.');
  return value;
}
