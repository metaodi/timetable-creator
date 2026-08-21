import type { Dispatch } from 'react';
import { getCell, maxSpan, rowLabel } from '../../config/grid';
import type { Action, CellRef } from '../../state/reducer';
import type { TimetableConfig } from '../../types/config';
import { LessonChip } from '../LessonChip';
import { Modal } from '../Modal';

interface CellEditorProps {
  config: TimetableConfig;
  target: CellRef;
  dispatch: Dispatch<Action>;
  onClose: () => void;
}

export function CellEditor({ config, target, dispatch, onClose }: CellEditorProps) {
  const row = config.rows.find((entry) => entry.id === target.rowId);
  const day = config.days.find((entry) => entry.id === target.dayId);
  if (!row || row.kind !== 'lesson' || !day) return null;

  const cell = getCell(config, target.rowId, target.dayId);
  const blocked = cell?.blocked === true;
  const span = cell?.daySpan ?? 1;
  const spanOptions = Array.from({ length: maxSpan(config, target.rowId, target.dayId) }, (_, i) => i + 1);

  return (
    <Modal title={`${day.label}, ${rowLabel(row)}`} onClose={onClose}>
      <fieldset className="field">
        <legend className="field__label">Lektion</legend>
        <div className="chip-choice">
          <button
            type="button"
            className={`toggle${!cell?.lessonTypeId ? ' toggle--active' : ''}`}
            disabled={blocked}
            onClick={() => dispatch({ type: 'clearCell', target })}
          >
            leer
          </button>
          {config.lessonTypes.map((lessonType) => (
            <button
              key={lessonType.id}
              type="button"
              // Das Kürzel allein sagt Screenreadern nichts — deshalb der Fachname.
              aria-label={lessonType.name || lessonType.abbreviation}
              className={`toggle${cell?.lessonTypeId === lessonType.id ? ' toggle--active' : ''}`}
              disabled={blocked}
              onClick={() =>
                dispatch({ type: 'placeLesson', target, lessonTypeId: lessonType.id })
              }
            >
              <LessonChip lessonType={lessonType} compact />
            </button>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span className="field__label">Zusatz in dieser Zelle</span>
        <input
          className="field__input"
          value={cell?.note ?? ''}
          disabled={blocked}
          placeholder="z.B. (Feld)"
          onChange={(event) =>
            dispatch({ type: 'setCellNote', target, note: event.target.value })
          }
        />
      </label>

      <label className="field">
        <span className="field__label">Über wie viele Tage?</span>
        <select
          className="field__input"
          value={span}
          disabled={blocked}
          onChange={(event) =>
            dispatch({ type: 'setCellSpan', target, span: Number(event.target.value) })
          }
        >
          {spanOptions.map((option) => (
            <option key={option} value={option}>
              {option === 1 ? '1 Tag' : `${option} Tage (Band)`}
            </option>
          ))}
        </select>
        <span className="hint">
          Ein Band fasst mehrere Tage zusammen — wie die «Auffangzeit» über die ganze Woche.
        </span>
      </label>

      <label className="field field--checkbox">
        <input
          type="checkbox"
          checked={blocked}
          onChange={(event) =>
            dispatch({ type: 'setCellBlocked', target, blocked: event.target.checked })
          }
        />
        <span>Kein Unterricht (graue Zelle)</span>
      </label>
    </Modal>
  );
}
