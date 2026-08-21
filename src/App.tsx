import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useMemo, useState } from 'react';
import { Legend } from './components/Legend';
import { LessonChip } from './components/LessonChip';
import { LessonPalette } from './components/LessonPalette';
import { PlanHeader } from './components/PlanHeader';
import { TimetableTable } from './components/TimetableTable';
import { Toolbar } from './components/Toolbar';
import { CellEditor } from './components/editors/CellEditor';
import { LessonTypeEditor } from './components/editors/LessonTypeEditor';
import { PlanSettings } from './components/editors/PlanSettings';
import type { DragPayload } from './components/GridCell';
import { newId } from './config/ids';
import { useTimetable } from './state/TimetableContext';
import type { CellRef } from './state/reducer';
import type { LessonType } from './types/config';

function createLessonType(): LessonType {
  return { id: newId('lt'), abbreviation: '', name: '', display: 'text', color: '#e8f1fb' };
}

export function App() {
  const { workspace, config, dispatch } = useTimetable();
  const [preview, setPreview] = useState(false);
  const [selectedCell, setSelectedCell] = useState<CellRef | null>(null);
  const [editedType, setEditedType] = useState<{ lessonType: LessonType; isNew: boolean } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dragged, setDragged] = useState<DragPayload | null>(null);

  const sensors = useSensors(
    // Kurzer Weg vor dem Ziehen: sonst wird jeder Klick zum Drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    // Kurzes Halten auf dem Handy, damit Scrollen weiterhin funktioniert.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const draggedType = useMemo(
    () => config.lessonTypes.find((type) => type.id === dragged?.lessonTypeId),
    [config.lessonTypes, dragged],
  );

  function onDragStart(event: DragStartEvent) {
    setDragged((event.active.data.current as DragPayload | undefined) ?? null);
  }

  function onDragEnd(event: DragEndEvent) {
    setDragged(null);
    const payload = event.active.data.current as DragPayload | undefined;
    if (!payload) return;

    const target = event.over?.data.current as CellRef | undefined;

    if (!target) {
      // Ausserhalb des Rasters losgelassen: platzierte Lektion entfernen.
      if (payload.from === 'cell' && payload.rowId && payload.dayId) {
        dispatch({ type: 'clearCell', target: { rowId: payload.rowId, dayId: payload.dayId } });
      }
      return;
    }

    if (payload.from === 'palette') {
      dispatch({ type: 'placeLesson', target, lessonTypeId: payload.lessonTypeId });
      return;
    }
    if (payload.rowId && payload.dayId) {
      dispatch({
        type: 'moveLesson',
        from: { rowId: payload.rowId, dayId: payload.dayId },
        to: target,
      });
    }
  }

  const editable = !preview;

  return (
    <DndContext
      sensors={sensors}
      // Ohne Auto-Scroll: beim Ziehen mit dem Finger schaukelt es sich sonst auf
      // (die Seite scrollt, dadurch wandert das gezogene Element mit, was weiter
      // scrollt) und die Zielzelle rutscht unter dem Finger weg. Auf kleinen
      // Displays also erst zur Zielzelle scrollen — oder sie antippen und die
      // Lektion im Zellen-Dialog wählen.
      autoScroll={false}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragged(null)}
    >
      <div className={`app${preview ? ' app--preview' : ''}`}>
        <Toolbar
          workspace={workspace}
          config={config}
          dispatch={dispatch}
          preview={preview}
          onTogglePreview={() => {
            setPreview((current) => !current);
            setSelectedCell(null);
          }}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <div className="app__body">
          {editable ? (
            <LessonPalette
              lessonTypes={config.lessonTypes}
              onEdit={(lessonType) => setEditedType({ lessonType, isNew: false })}
              onCreate={() => setEditedType({ lessonType: createLessonType(), isNew: true })}
            />
          ) : null}

          <main className="sheet">
            <PlanHeader config={config} />
            <TimetableTable
              config={config}
              editable={editable}
              selected={selectedCell}
              onSelect={setSelectedCell}
            />
            <Legend config={config} />
          </main>
        </div>

        {preview ? (
          <p className="print-hint no-print">
            Druckvorschau. Im Druckdialog «Hintergrundgrafiken» aktivieren und Querformat wählen,
            dann «Als PDF sichern».
          </p>
        ) : null}
      </div>

      {selectedCell && editable ? (
        <CellEditor
          config={config}
          target={selectedCell}
          dispatch={dispatch}
          onClose={() => setSelectedCell(null)}
        />
      ) : null}

      {editedType ? (
        <LessonTypeEditor
          config={config}
          lessonType={editedType.lessonType}
          isNew={editedType.isNew}
          onSave={(lessonType) => {
            dispatch({ type: 'upsertLessonType', lessonType });
            setEditedType(null);
          }}
          onDelete={(lessonTypeId) => {
            dispatch({ type: 'removeLessonType', lessonTypeId });
            setEditedType(null);
          }}
          onClose={() => setEditedType(null)}
        />
      ) : null}

      {settingsOpen ? (
        <PlanSettings config={config} dispatch={dispatch} onClose={() => setSettingsOpen(false)} />
      ) : null}

      <DragOverlay dropAnimation={null}>
        {draggedType ? <LessonChip lessonType={draggedType} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
