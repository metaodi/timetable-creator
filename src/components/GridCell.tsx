import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { Cell, LessonType } from '../types/config';
import type { CellRef } from '../state/reducer';
import { LessonChip } from './LessonChip';

export const DROP_PREFIX = 'cell:';
export const DRAG_PLACED_PREFIX = 'placed:';
export const DRAG_PALETTE_PREFIX = 'palette:';

export interface DragPayload {
  from: 'palette' | 'cell';
  lessonTypeId: string;
  rowId?: string;
  dayId?: string;
}

interface GridCellProps {
  cellRef: CellRef;
  cell: Cell | undefined;
  lessonType: LessonType | undefined;
  secondLessonType: LessonType | undefined;
  colSpan: number;
  editable: boolean;
  selected: boolean;
  ariaLabel: string;
  onSelect: (ref: CellRef) => void;
}

/** Eine Hälfte einer geteilten Zelle (1. oder 2. Semester). */
function SplitHalf({ lessonType, note }: { lessonType: LessonType | undefined; note: string | undefined }) {
  if (!lessonType && !note) return null;
  return lessonType ? (
    <LessonChip lessonType={lessonType} note={note} compact />
  ) : (
    <span className="grid-cell__note">{note}</span>
  );
}

/**
 * Belegte Zelle: ein einziges Bedienelement, das sowohl ziehbar ist (verschieben)
 * als auch auf Klick den Zellen-Editor öffnet. dnd-kit unterscheidet beides über
 * die Aktivierungsschwelle der Sensoren, deshalb bleibt der Klick erhalten.
 */
function PlacedLesson({
  cellRef,
  lessonType,
  note,
  ariaLabel,
  selected,
  onSelect,
}: {
  cellRef: CellRef;
  lessonType: LessonType;
  note: string | undefined;
  ariaLabel: string;
  selected: boolean;
  onSelect: (ref: CellRef) => void;
}) {
  const payload: DragPayload = {
    from: 'cell',
    lessonTypeId: lessonType.id,
    rowId: cellRef.rowId,
    dayId: cellRef.dayId,
  };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${DRAG_PLACED_PREFIX}${cellRef.rowId}|${cellRef.dayId}`,
    data: payload,
  });

  return (
    <button
      type="button"
      ref={setNodeRef}
      className={`grid-cell__button${isDragging ? ' grid-cell__button--dragging' : ''}`}
      {...attributes}
      {...listeners}
      aria-label={ariaLabel}
      aria-pressed={selected}
      onClick={() => onSelect(cellRef)}
    >
      <LessonChip lessonType={lessonType} note={note} />
    </button>
  );
}

export function GridCell({
  cellRef,
  cell,
  lessonType,
  secondLessonType,
  colSpan,
  editable,
  selected,
  ariaLabel,
  onSelect,
}: GridCellProps) {
  const blocked = cell?.blocked === true;
  const split = cell?.split === true;
  const { setNodeRef, isOver } = useDroppable({
    id: `${DROP_PREFIX}${cellRef.rowId}|${cellRef.dayId}`,
    data: cellRef,
    disabled: blocked || !editable,
  });

  const className = [
    'grid-cell',
    blocked ? 'grid-cell--blocked' : '',
    isOver ? 'grid-cell--over' : '',
    selected ? 'grid-cell--selected' : '',
    colSpan > 1 ? 'grid-cell--band' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const staticContent = split ? (
    <span className="grid-cell__split">
      <span className="grid-cell__split-half">
        <SplitHalf lessonType={lessonType} note={cell?.note} />
      </span>
      <span className="grid-cell__split-half">
        <SplitHalf lessonType={secondLessonType} note={cell?.secondNote} />
      </span>
    </span>
  ) : lessonType ? (
    <LessonChip lessonType={lessonType} note={cell?.note} />
  ) : cell?.note ? (
    <span className="grid-cell__note">{cell.note}</span>
  ) : null;

  return (
    <td ref={setNodeRef} className={className} colSpan={colSpan}>
      {!editable ? (
        staticContent
      ) : split ? (
        <button
          type="button"
          className="grid-cell__button"
          aria-label={ariaLabel}
          aria-pressed={selected}
          onClick={() => onSelect(cellRef)}
        >
          {staticContent}
        </button>
      ) : lessonType ? (
        <PlacedLesson
          cellRef={cellRef}
          lessonType={lessonType}
          note={cell?.note}
          ariaLabel={ariaLabel}
          selected={selected}
          onSelect={onSelect}
        />
      ) : (
        <button
          type="button"
          className="grid-cell__button grid-cell__button--empty"
          aria-label={ariaLabel}
          aria-pressed={selected}
          onClick={() => onSelect(cellRef)}
        >
          {staticContent}
        </button>
      )}
    </td>
  );
}
