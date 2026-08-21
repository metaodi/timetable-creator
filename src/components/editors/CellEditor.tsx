import type { Dispatch } from 'react';
import { getCell, maxSpan, rowLabel } from '../../config/grid';
import type { Action, CellRef } from '../../state/reducer';
import type { LessonType, TimetableConfig } from '../../types/config';
import { LessonChip } from '../LessonChip';
import { Modal } from '../Modal';

interface CellEditorProps {
  config: TimetableConfig;
  target: CellRef;
  dispatch: Dispatch<Action>;
  onClose: () => void;
}

interface LessonPickerProps {
  legend: string;
  noteLabel: string;
  lessonTypes: LessonType[];
  activeId: string | undefined;
  disabled: boolean;
  onPick: (lessonTypeId: string) => void;
  onClear: () => void;
  note: string;
  onNoteChange: (note: string) => void;
}

/** Ein Lektionsauswahl-Feld samt Zusatztext — für eine ganze Zelle oder eine Semesterhälfte. */
function LessonPicker({
  legend,
  noteLabel,
  lessonTypes,
  activeId,
  disabled,
  onPick,
  onClear,
  note,
  onNoteChange,
}: LessonPickerProps) {
  return (
    <>
      <fieldset className="field">
        <legend className="field__label">{legend}</legend>
        <div className="chip-choice">
          <button
            type="button"
            className={`toggle${!activeId ? ' toggle--active' : ''}`}
            disabled={disabled}
            onClick={onClear}
          >
            leer
          </button>
          {lessonTypes.map((lessonType) => (
            <button
              key={lessonType.id}
              type="button"
              // Das Kürzel allein sagt Screenreadern nichts — deshalb der Fachname.
              aria-label={lessonType.name || lessonType.abbreviation}
              className={`toggle${activeId === lessonType.id ? ' toggle--active' : ''}`}
              disabled={disabled}
              onClick={() => onPick(lessonType.id)}
            >
              <LessonChip lessonType={lessonType} compact />
            </button>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span className="field__label">{noteLabel}</span>
        <input
          className="field__input"
          value={note}
          disabled={disabled}
          placeholder="z.B. (Feld)"
          onChange={(event) => onNoteChange(event.target.value)}
        />
      </label>
    </>
  );
}

export function CellEditor({ config, target, dispatch, onClose }: CellEditorProps) {
  const row = config.rows.find((entry) => entry.id === target.rowId);
  const day = config.days.find((entry) => entry.id === target.dayId);
  if (!row || row.kind !== 'lesson' || !day) return null;

  const cell = getCell(config, target.rowId, target.dayId);
  const blocked = cell?.blocked === true;
  const split = cell?.split === true;
  const span = cell?.daySpan ?? 1;
  const spanOptions = Array.from({ length: maxSpan(config, target.rowId, target.dayId) }, (_, i) => i + 1);

  return (
    <Modal title={`${day.label}, ${rowLabel(row)}`} onClose={onClose}>
      <label className="field field--checkbox">
        <input
          type="checkbox"
          checked={split}
          disabled={blocked}
          onChange={(event) =>
            dispatch({ type: 'setCellSplit', target, split: event.target.checked })
          }
        />
        <span>Zelle teilen (1./2. Semester unterschiedlich)</span>
      </label>

      {split ? (
        <>
          <LessonPicker
            legend="1. Semester"
            noteLabel="Zusatz (1. Semester)"
            lessonTypes={config.lessonTypes}
            activeId={cell?.lessonTypeId}
            disabled={blocked}
            onPick={(lessonTypeId) => dispatch({ type: 'placeLesson', target, lessonTypeId })}
            onClear={() => dispatch({ type: 'clearCell', target })}
            note={cell?.note ?? ''}
            onNoteChange={(note) => dispatch({ type: 'setCellNote', target, note })}
          />
          <LessonPicker
            legend="2. Semester"
            noteLabel="Zusatz (2. Semester)"
            lessonTypes={config.lessonTypes}
            activeId={cell?.secondLessonTypeId}
            disabled={blocked}
            onPick={(lessonTypeId) => dispatch({ type: 'placeLessonSecond', target, lessonTypeId })}
            onClear={() => dispatch({ type: 'clearCellSecond', target })}
            note={cell?.secondNote ?? ''}
            onNoteChange={(note) => dispatch({ type: 'setCellNoteSecond', target, note })}
          />
        </>
      ) : (
        <LessonPicker
          legend="Lektion"
          noteLabel="Zusatz in dieser Zelle"
          lessonTypes={config.lessonTypes}
          activeId={cell?.lessonTypeId}
          disabled={blocked}
          onPick={(lessonTypeId) => dispatch({ type: 'placeLesson', target, lessonTypeId })}
          onClear={() => dispatch({ type: 'clearCell', target })}
          note={cell?.note ?? ''}
          onNoteChange={(note) => dispatch({ type: 'setCellNote', target, note })}
        />
      )}

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
