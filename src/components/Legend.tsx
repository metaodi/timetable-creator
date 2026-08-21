import type { TimetableConfig } from '../types/config';
import { LessonChip } from './LessonChip';

/**
 * Legende: alle Lektionsarten des Plans (ausser den ausgeblendeten) plus
 * manuell gepflegte Zusatzzeilen wie "Klassenassistenz".
 */
export function Legend({ config }: { config: TimetableConfig }) {
  if (!config.legend.visible) return null;

  const types = config.lessonTypes.filter((type) => type.showInLegend !== false);
  if (types.length === 0 && config.legend.extraEntries.length === 0) return null;

  return (
    <section className="legend">
      <h2 className="legend__title">Legende</h2>
      <table className="legend__table">
        <thead>
          <tr>
            <th scope="col">Abkürzung</th>
            <th scope="col">Fach</th>
            <th scope="col">Lehrperson</th>
            <th scope="col">Ort</th>
          </tr>
        </thead>
        <tbody>
          {types.map((type) => (
            <tr key={type.id}>
              <td>
                <LessonChip lessonType={type} compact />
              </td>
              <td>{type.name}</td>
              <td>{type.teacher ?? ''}</td>
              <td>{type.location ?? ''}</td>
            </tr>
          ))}
          {config.legend.extraEntries.map((entry) => (
            <tr key={entry.id}>
              <td>{entry.abbreviation}</td>
              <td>{entry.name}</td>
              <td>{entry.teacher ?? ''}</td>
              <td>{entry.location ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
