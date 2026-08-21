import type { LessonType } from '../types/config';

interface LessonChipProps {
  lessonType: LessonType;
  note?: string;
  /** Kompakte Darstellung für die Palette. */
  compact?: boolean;
  dragging?: boolean;
}

/** Darstellung einer Lektionsart — identisch in Raster, Palette und Drag-Overlay. */
export function LessonChip({ lessonType, note, compact, dragging }: LessonChipProps) {
  const showIcon = lessonType.icon && lessonType.display !== 'text';
  const showText = lessonType.display !== 'image' || !lessonType.icon;

  const className = [
    'chip',
    compact ? 'chip--compact' : '',
    dragging ? 'chip--dragging' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={className} style={lessonType.color ? { background: lessonType.color } : undefined}>
      {showIcon && lessonType.icon ? (
        lessonType.icon.kind === 'emoji' ? (
          <span className="chip__emoji" aria-hidden="true">
            {lessonType.icon.value}
          </span>
        ) : (
          <img className="chip__image" src={lessonType.icon.dataUrl} alt="" />
        )
      ) : null}
      {showText ? <span className="chip__text">{lessonType.abbreviation || lessonType.name}</span> : null}
      {note ? <span className="chip__note">{note}</span> : null}
      {/* Bei reiner Bilddarstellung bleibt der Name für Screenreader erhalten. */}
      {!showText ? <span className="visually-hidden">{lessonType.name}</span> : null}
    </span>
  );
}
