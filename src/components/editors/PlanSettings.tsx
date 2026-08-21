import { useRef, useState, type Dispatch } from 'react';
import { readImageAsDataUrl } from '../../config/io';
import type { Action } from '../../state/reducer';
import type { TimetableConfig } from '../../types/config';
import { Modal } from '../Modal';

type Tab = 'kopf' | 'zeilen' | 'tage' | 'legende';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'kopf', label: 'Kopfbereich' },
  { id: 'zeilen', label: 'Zeilen' },
  { id: 'tage', label: 'Wochentage' },
  { id: 'legende', label: 'Legende' },
];

interface PlanSettingsProps {
  config: TimetableConfig;
  dispatch: Dispatch<Action>;
  onClose: () => void;
}

export function PlanSettings({ config, dispatch, onClose }: PlanSettingsProps) {
  const [tab, setTab] = useState<Tab>('kopf');

  return (
    <Modal title="Stundenplan einrichten" onClose={onClose}>
      <div className="tabs" role="tablist">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={tab === entry.id}
            className={`tabs__tab${tab === entry.id ? ' tabs__tab--active' : ''}`}
            onClick={() => setTab(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === 'kopf' ? <HeaderTab config={config} dispatch={dispatch} /> : null}
      {tab === 'zeilen' ? <RowsTab config={config} dispatch={dispatch} /> : null}
      {tab === 'tage' ? <DaysTab config={config} dispatch={dispatch} /> : null}
      {tab === 'legende' ? <LegendTab config={config} dispatch={dispatch} /> : null}
    </Modal>
  );
}

function HeaderTab({ config, dispatch }: { config: TimetableConfig; dispatch: Dispatch<Action> }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <label className="field">
        <span className="field__label">Name des Plans (nur in der Verwaltung)</span>
        <input
          className="field__input"
          value={config.name}
          onChange={(event) => dispatch({ type: 'setPlanName', name: event.target.value })}
        />
      </label>
      <label className="field">
        <span className="field__label">Titel</span>
        <input
          className="field__input"
          value={config.meta.title}
          onChange={(event) => dispatch({ type: 'setMeta', patch: { title: event.target.value } })}
        />
      </label>
      <label className="field">
        <span className="field__label">Untertitel</span>
        <input
          className="field__input"
          value={config.meta.subtitle}
          placeholder="Schuljahr, Schulhaus, Klasse"
          onChange={(event) => dispatch({ type: 'setMeta', patch: { subtitle: event.target.value } })}
        />
      </label>
      <div className="field">
        <span className="field__label">Logo</span>
        <div className="upload-row">
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="visually-hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              readImageAsDataUrl(file, 512)
                .then((logoDataUrl) => {
                  dispatch({ type: 'setMeta', patch: { logoDataUrl } });
                  setError(null);
                })
                .catch((cause: unknown) =>
                  setError(cause instanceof Error ? cause.message : 'Fehler beim Laden.'),
                );
            }}
          />
          <button type="button" className="button button--small" onClick={() => fileInput.current?.click()}>
            Logo wählen
          </button>
          {config.meta.logoDataUrl ? (
            <>
              <img className="upload-row__preview" src={config.meta.logoDataUrl} alt="" />
              <button
                type="button"
                className="button button--small"
                onClick={() => dispatch({ type: 'setMeta', patch: { logoDataUrl: undefined } })}
              >
                Entfernen
              </button>
            </>
          ) : null}
        </div>
        {error ? <p className="error">{error}</p> : null}
      </div>
    </>
  );
}

function RowsTab({ config, dispatch }: { config: TimetableConfig; dispatch: Dispatch<Action> }) {
  return (
    <>
      <ul className="editor-list">
        {config.rows.map((row, index) => (
          <li key={row.id} className="editor-list__item">
            {row.kind === 'lesson' ? (
              <>
                <input
                  className="field__input field__input--time"
                  type="time"
                  aria-label="Beginn"
                  value={row.start}
                  onChange={(event) =>
                    dispatch({ type: 'updateRow', rowId: row.id, patch: { start: event.target.value } })
                  }
                />
                <span aria-hidden="true">–</span>
                <input
                  className="field__input field__input--time"
                  type="time"
                  aria-label="Ende"
                  value={row.end}
                  onChange={(event) =>
                    dispatch({ type: 'updateRow', rowId: row.id, patch: { end: event.target.value } })
                  }
                />
                <input
                  className="field__input"
                  aria-label="Eigene Beschriftung"
                  placeholder="eigene Beschriftung"
                  value={row.label ?? ''}
                  onChange={(event) =>
                    dispatch({ type: 'updateRow', rowId: row.id, patch: { label: event.target.value } })
                  }
                />
              </>
            ) : (
              <input
                className="field__input"
                aria-label="Beschriftung der Trennzeile"
                value={row.label}
                onChange={(event) =>
                  dispatch({ type: 'updateRow', rowId: row.id, patch: { label: event.target.value } })
                }
              />
            )}
            <MoveButtons
              onUp={() => dispatch({ type: 'moveRow', rowId: row.id, direction: -1 })}
              onDown={() => dispatch({ type: 'moveRow', rowId: row.id, direction: 1 })}
              upDisabled={index === 0}
              downDisabled={index === config.rows.length - 1}
            />
            <button
              type="button"
              className="button button--icon button--danger"
              aria-label="Zeile löschen"
              disabled={config.rows.length <= 1}
              onClick={() => dispatch({ type: 'removeRow', rowId: row.id })}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="button-row">
        <button type="button" className="button" onClick={() => dispatch({ type: 'addRow', kind: 'lesson' })}>
          + Lektionszeile
        </button>
        <button
          type="button"
          className="button"
          onClick={() => dispatch({ type: 'addRow', kind: 'separator' })}
        >
          + Trennzeile
        </button>
      </div>
    </>
  );
}

function DaysTab({ config, dispatch }: { config: TimetableConfig; dispatch: Dispatch<Action> }) {
  const [label, setLabel] = useState('');

  return (
    <>
      <ul className="editor-list">
        {config.days.map((day, index) => (
          <li key={day.id} className="editor-list__item">
            <input
              className="field__input"
              aria-label="Bezeichnung des Tages"
              value={day.label}
              onChange={(event) =>
                dispatch({ type: 'updateDay', dayId: day.id, label: event.target.value })
              }
            />
            <MoveButtons
              onUp={() => dispatch({ type: 'moveDay', dayId: day.id, direction: -1 })}
              onDown={() => dispatch({ type: 'moveDay', dayId: day.id, direction: 1 })}
              upDisabled={index === 0}
              downDisabled={index === config.days.length - 1}
              labels={['Nach links', 'Nach rechts']}
            />
            <button
              type="button"
              className="button button--icon button--danger"
              aria-label="Tag löschen"
              disabled={config.days.length <= 1}
              onClick={() => dispatch({ type: 'removeDay', dayId: day.id })}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="button-row">
        <input
          className="field__input"
          aria-label="Neuer Tag"
          placeholder="z.B. Samstag"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
        />
        <button
          type="button"
          className="button"
          onClick={() => {
            dispatch({ type: 'addDay', label });
            setLabel('');
          }}
        >
          + Tag
        </button>
      </div>
    </>
  );
}

function LegendTab({ config, dispatch }: { config: TimetableConfig; dispatch: Dispatch<Action> }) {
  return (
    <>
      <label className="field field--checkbox">
        <input
          type="checkbox"
          checked={config.legend.visible}
          onChange={(event) => dispatch({ type: 'setLegendVisible', visible: event.target.checked })}
        />
        <span>Legende anzeigen</span>
      </label>
      <p className="hint">
        Die Legende listet automatisch alle Lektionsarten auf. Hier lassen sich zusätzliche Zeilen
        ergänzen, z.B. «Klassenassistenz».
      </p>
      <ul className="editor-list">
        {config.legend.extraEntries.map((entry) => (
          <li key={entry.id} className="editor-list__item editor-list__item--wrap">
            <input
              className="field__input"
              aria-label="Abkürzung"
              placeholder="Abkürzung"
              value={entry.abbreviation}
              onChange={(event) =>
                dispatch({
                  type: 'updateLegendEntry',
                  entryId: entry.id,
                  patch: { abbreviation: event.target.value },
                })
              }
            />
            <input
              className="field__input"
              aria-label="Fach"
              placeholder="Fach"
              value={entry.name}
              onChange={(event) =>
                dispatch({
                  type: 'updateLegendEntry',
                  entryId: entry.id,
                  patch: { name: event.target.value },
                })
              }
            />
            <input
              className="field__input"
              aria-label="Lehrperson"
              placeholder="Lehrperson"
              value={entry.teacher ?? ''}
              onChange={(event) =>
                dispatch({
                  type: 'updateLegendEntry',
                  entryId: entry.id,
                  patch: { teacher: event.target.value },
                })
              }
            />
            <input
              className="field__input"
              aria-label="Ort"
              placeholder="Ort"
              value={entry.location ?? ''}
              onChange={(event) =>
                dispatch({
                  type: 'updateLegendEntry',
                  entryId: entry.id,
                  patch: { location: event.target.value },
                })
              }
            />
            <button
              type="button"
              className="button button--icon button--danger"
              aria-label="Zeile löschen"
              onClick={() => dispatch({ type: 'removeLegendEntry', entryId: entry.id })}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div className="button-row">
        <button type="button" className="button" onClick={() => dispatch({ type: 'addLegendEntry' })}>
          + Zusatzzeile
        </button>
      </div>
    </>
  );
}

function MoveButtons({
  onUp,
  onDown,
  upDisabled,
  downDisabled,
  labels = ['Nach oben', 'Nach unten'],
}: {
  onUp: () => void;
  onDown: () => void;
  upDisabled: boolean;
  downDisabled: boolean;
  labels?: [string, string];
}) {
  return (
    <span className="move-buttons">
      <button
        type="button"
        className="button button--icon"
        aria-label={labels[0]}
        disabled={upDisabled}
        onClick={onUp}
      >
        ↑
      </button>
      <button
        type="button"
        className="button button--icon"
        aria-label={labels[1]}
        disabled={downDisabled}
        onClick={onDown}
      >
        ↓
      </button>
    </span>
  );
}
