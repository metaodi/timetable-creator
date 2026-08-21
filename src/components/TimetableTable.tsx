import { useMemo } from 'react';
import { rowLabel, rowLayout } from '../config/grid';
import type { CellRef } from '../state/reducer';
import type { LessonType, TimetableConfig } from '../types/config';
import { GridCell } from './GridCell';

interface TimetableTableProps {
  config: TimetableConfig;
  editable: boolean;
  selected: CellRef | null;
  onSelect: (ref: CellRef) => void;
}

export function TimetableTable({ config, editable, selected, onSelect }: TimetableTableProps) {
  const typesById = useMemo(() => {
    const map = new Map<string, LessonType>();
    for (const type of config.lessonTypes) map.set(type.id, type);
    return map;
  }, [config.lessonTypes]);

  return (
    <table className="timetable">
      <thead>
        <tr>
          <th scope="col" className="timetable__time-head">
            Zeit
          </th>
          {config.days.map((day) => (
            <th scope="col" key={day.id}>
              {day.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {config.rows.map((row) => {
          if (row.kind === 'separator') {
            return (
              <tr key={row.id} className="timetable__separator">
                <td colSpan={config.days.length + 1}>{row.label}</td>
              </tr>
            );
          }

          return (
            <tr key={row.id}>
              <th scope="row" className="timetable__time">
                {rowLabel(row)}
              </th>
              {rowLayout(config, row.id).map(({ day, cell, colSpan }) => {
                const lessonType = cell?.lessonTypeId ? typesById.get(cell.lessonTypeId) : undefined;
                const secondLessonType = cell?.secondLessonTypeId
                  ? typesById.get(cell.secondLessonTypeId)
                  : undefined;
                const isSelected =
                  selected?.rowId === row.id && selected.dayId === day.id;
                const description = cell?.blocked
                  ? 'kein Unterricht'
                  : cell?.split
                    ? `1. Semester: ${lessonType?.name ?? 'leer'}, 2. Semester: ${secondLessonType?.name ?? 'leer'}`
                    : (lessonType?.name ?? 'leer');
                return (
                  <GridCell
                    key={day.id}
                    cellRef={{ rowId: row.id, dayId: day.id }}
                    cell={cell}
                    lessonType={lessonType}
                    secondLessonType={secondLessonType}
                    colSpan={colSpan}
                    editable={editable}
                    selected={isSelected}
                    ariaLabel={`${day.label}, ${rowLabel(row)}: ${description}`}
                    onSelect={onSelect}
                  />
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
