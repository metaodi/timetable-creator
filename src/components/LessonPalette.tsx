import { useDraggable } from '@dnd-kit/core';
import type { LessonType } from '../types/config';
import { DRAG_PALETTE_PREFIX, type DragPayload } from './GridCell';
import { LessonChip } from './LessonChip';

function PaletteItem({
  lessonType,
  onEdit,
}: {
  lessonType: LessonType;
  onEdit: (lessonType: LessonType) => void;
}) {
  const payload: DragPayload = { from: 'palette', lessonTypeId: lessonType.id };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${DRAG_PALETTE_PREFIX}${lessonType.id}`,
    data: payload,
  });

  return (
    <li className="palette__item">
      <button
        type="button"
        ref={setNodeRef}
        className={`palette__button${isDragging ? ' palette__button--dragging' : ''}`}
        onClick={() => onEdit(lessonType)}
        aria-label={lessonType.name || lessonType.abbreviation}
        title={`${lessonType.name} — ziehen zum Platzieren, tippen zum Bearbeiten`}
        {...listeners}
        {...attributes}
      >
        <LessonChip lessonType={lessonType} compact />
      </button>
    </li>
  );
}

interface LessonPaletteProps {
  lessonTypes: LessonType[];
  onEdit: (lessonType: LessonType) => void;
  onCreate: () => void;
}

export function LessonPalette({ lessonTypes, onEdit, onCreate }: LessonPaletteProps) {
  return (
    <section className="palette no-print" aria-label="Lektionsarten">
      <div className="palette__header">
        <h2 className="palette__title">Lektionsarten</h2>
        <button type="button" className="button button--small" onClick={onCreate}>
          + Neu
        </button>
      </div>
      <p className="palette__hint">In eine Zelle ziehen. Tippen öffnet die Bearbeitung.</p>
      <ul className="palette__list">
        {lessonTypes.map((lessonType) => (
          <PaletteItem key={lessonType.id} lessonType={lessonType} onEdit={onEdit} />
        ))}
      </ul>
    </section>
  );
}
