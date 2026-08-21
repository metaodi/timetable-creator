import { useRef, useState } from 'react';
import { readImageAsDataUrl } from '../../config/io';
import { usedLessonTypeIds } from '../../config/grid';
import type { LessonDisplay, LessonType, TimetableConfig } from '../../types/config';
import { LessonChip } from '../LessonChip';
import { Modal } from '../Modal';

const EMOJI_CHOICES = [
  '🧙', '📚', '✏️', '🔢', '🧪', '🌍', '🎨', '✂️', '🧵', '🔨',
  '🎵', '🎹', '🎭', '⚽', '🏊', '🤸', '🏃', '💻', '🗣️', '🍎',
  '🧘', '🎲', '🌱', '⭐',
];

const COLOR_CHOICES = [
  '#e8f1fb', '#dcfce7', '#fef3c7', '#fce7f3', '#ede9fe',
  '#cffafe', '#ffedd5', '#f1f5f9', '#fee2e2', '#ffffff',
];

const DISPLAY_OPTIONS: Array<{ value: LessonDisplay; label: string }> = [
  { value: 'text', label: 'Nur Text' },
  { value: 'image', label: 'Nur Bild' },
  { value: 'both', label: 'Bild und Text' },
];

interface LessonTypeEditorProps {
  config: TimetableConfig;
  lessonType: LessonType;
  /** true, wenn die Lektionsart noch nicht im Plan gespeichert ist. */
  isNew: boolean;
  onSave: (lessonType: LessonType) => void;
  onDelete: (lessonTypeId: string) => void;
  onClose: () => void;
}

export function LessonTypeEditor({
  config,
  lessonType,
  isNew,
  onSave,
  onDelete,
  onClose,
}: LessonTypeEditorProps) {
  const [draft, setDraft] = useState<LessonType>(lessonType);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const inUse = usedLessonTypeIds(config).includes(lessonType.id);

  function patch(changes: Partial<LessonType>) {
    setDraft((current) => ({ ...current, ...changes }));
  }

  async function onPickImage(file: File | undefined) {
    if (!file) return;
    try {
      const dataUrl = await readImageAsDataUrl(file);
      patch({ icon: { kind: 'image', dataUrl } });
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Das Bild konnte nicht geladen werden.');
    }
  }

  function save() {
    const abbreviation = draft.abbreviation.trim();
    const name = draft.name.trim();
    if (!abbreviation && !name) {
      setError('Bitte mindestens ein Kürzel oder einen Namen angeben.');
      return;
    }
    if (draft.display !== 'text' && !draft.icon) {
      setError('Für die Bild-Darstellung braucht es ein Emoji oder ein hochgeladenes Bild.');
      return;
    }
    onSave({ ...draft, abbreviation, name: name || abbreviation });
  }

  return (
    <Modal
      title={isNew ? 'Neue Lektionsart' : 'Lektionsart bearbeiten'}
      onClose={onClose}
      footer={
        <>
          {!isNew ? (
            <button
              type="button"
              className="button button--danger"
              onClick={() => {
                const message = inUse
                  ? 'Diese Lektionsart wird im Stundenplan verwendet. Wirklich löschen? Die betroffenen Zellen werden geleert.'
                  : 'Lektionsart wirklich löschen?';
                if (window.confirm(message)) onDelete(lessonType.id);
              }}
            >
              Löschen
            </button>
          ) : null}
          <span className="spacer" />
          <button type="button" className="button" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="button button--primary" onClick={save}>
            Speichern
          </button>
        </>
      }
    >
      <div className="preview-row">
        <span className="preview-row__label">Vorschau</span>
        <LessonChip lessonType={draft} />
      </div>

      <label className="field">
        <span className="field__label">Kürzel (in der Zelle)</span>
        <input
          className="field__input"
          value={draft.abbreviation}
          onChange={(event) => patch({ abbreviation: event.target.value })}
          placeholder="z.B. BS"
        />
      </label>

      <label className="field">
        <span className="field__label">Fach (in der Legende)</span>
        <input
          className="field__input"
          value={draft.name}
          onChange={(event) => patch({ name: event.target.value })}
          placeholder="z.B. Bewegung und Sport"
        />
      </label>

      <div className="field-row">
        <label className="field">
          <span className="field__label">Lehrperson</span>
          <input
            className="field__input"
            value={draft.teacher ?? ''}
            onChange={(event) => patch({ teacher: event.target.value || undefined })}
          />
        </label>
        <label className="field">
          <span className="field__label">Ort</span>
          <input
            className="field__input"
            value={draft.location ?? ''}
            onChange={(event) => patch({ location: event.target.value || undefined })}
          />
        </label>
      </div>

      <fieldset className="field">
        <legend className="field__label">Darstellung</legend>
        <div className="chip-choice">
          {DISPLAY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`toggle${draft.display === option.value ? ' toggle--active' : ''}`}
              onClick={() => patch({ display: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="field">
        <legend className="field__label">Symbol</legend>
        <div className="chip-choice chip-choice--emoji">
          <button
            type="button"
            className={`toggle${!draft.icon ? ' toggle--active' : ''}`}
            onClick={() => patch({ icon: undefined })}
          >
            keines
          </button>
          {EMOJI_CHOICES.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={`Symbol ${emoji}`}
              className={`toggle toggle--emoji${
                draft.icon?.kind === 'emoji' && draft.icon.value === emoji ? ' toggle--active' : ''
              }`}
              onClick={() => patch({ icon: { kind: 'emoji', value: emoji } })}
            >
              {emoji}
            </button>
          ))}
        </div>
        <div className="upload-row">
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="visually-hidden"
            onChange={(event) => {
              void onPickImage(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          <button type="button" className="button button--small" onClick={() => fileInput.current?.click()}>
            Eigenes Bild hochladen
          </button>
          {draft.icon?.kind === 'image' ? (
            <>
              <img className="upload-row__preview" src={draft.icon.dataUrl} alt="" />
              <button
                type="button"
                className="button button--small"
                onClick={() => patch({ icon: undefined })}
              >
                Entfernen
              </button>
            </>
          ) : null}
        </div>
        <p className="hint">
          Bilder werden auf 256&nbsp;px verkleinert und in die Konfigurationsdatei eingebettet.
        </p>
      </fieldset>

      <fieldset className="field">
        <legend className="field__label">Farbe</legend>
        <div className="chip-choice">
          {COLOR_CHOICES.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Farbe ${color}`}
              className={`swatch${draft.color === color ? ' swatch--active' : ''}`}
              style={{ background: color }}
              onClick={() => patch({ color })}
            />
          ))}
        </div>
      </fieldset>

      <label className="field field--checkbox">
        <input
          type="checkbox"
          checked={draft.showInLegend !== false}
          onChange={(event) => patch({ showInLegend: event.target.checked ? undefined : false })}
        />
        <span>In der Legende anzeigen</span>
      </label>

      {error ? <p className="error">{error}</p> : null}
    </Modal>
  );
}
