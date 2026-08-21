import { useRef, useState, type Dispatch } from 'react';
import { createEmptyConfig } from '../config/defaults';
import { downloadConfig, readConfigFile } from '../config/io';
import type { Workspace } from '../config/storage';
import type { Action } from '../state/reducer';
import type { TimetableConfig } from '../types/config';

interface ToolbarProps {
  workspace: Workspace;
  config: TimetableConfig;
  dispatch: Dispatch<Action>;
  preview: boolean;
  onTogglePreview: () => void;
  onOpenSettings: () => void;
}

export function Toolbar({
  workspace,
  config,
  dispatch,
  preview,
  onTogglePreview,
  onOpenSettings,
}: ToolbarProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onImport(file: File | undefined) {
    if (!file) return;
    const result = await readConfigFile(file);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    dispatch({ type: 'addPlan', config: result.config });
    setMessage(`«${result.config.name}» importiert.`);
  }

  return (
    <div className="toolbar no-print">
      <div className="toolbar__group">
        <label className="visually-hidden" htmlFor="plan-select">
          Stundenplan
        </label>
        <select
          id="plan-select"
          className="field__input"
          value={workspace.activeId}
          onChange={(event) => dispatch({ type: 'selectPlan', planId: event.target.value })}
        >
          {workspace.plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="button"
          onClick={() => dispatch({ type: 'addPlan', config: createEmptyConfig() })}
        >
          Neu
        </button>
        <button
          type="button"
          className="button"
          onClick={() => dispatch({ type: 'duplicatePlan', planId: config.id })}
        >
          Duplizieren
        </button>
        <button
          type="button"
          className="button button--danger"
          disabled={workspace.plans.length <= 1}
          onClick={() => {
            if (window.confirm(`«${config.name}» wirklich löschen?`)) {
              dispatch({ type: 'removePlan', planId: config.id });
            }
          }}
        >
          Löschen
        </button>
      </div>

      <div className="toolbar__group">
        <button type="button" className="button" onClick={onOpenSettings}>
          Einrichten
        </button>
        <button type="button" className="button" onClick={() => downloadConfig(config)}>
          Export (JSON)
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          onChange={(event) => {
            void onImport(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        <button type="button" className="button" onClick={() => fileInput.current?.click()}>
          Import
        </button>
        <button
          type="button"
          className={`button${preview ? ' button--active' : ''}`}
          aria-pressed={preview}
          onClick={onTogglePreview}
        >
          {preview ? 'Bearbeiten' : 'Vorschau'}
        </button>
        <button type="button" className="button button--primary" onClick={() => window.print()}>
          Drucken / PDF
        </button>
      </div>

      {message ? (
        <p className="toolbar__message" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
