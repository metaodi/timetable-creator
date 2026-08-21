import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';
import { createSampleConfig } from '../config/defaults';
import { clearWorkspace } from '../config/storage';
import { TimetableProvider } from '../state/TimetableContext';

function renderApp() {
  const config = createSampleConfig();
  return render(
    <TimetableProvider initialWorkspace={{ activeId: config.id, plans: [config] }}>
      <App />
    </TimetableProvider>,
  );
}

describe('App', () => {
  beforeEach(() => {
    clearWorkspace();
  });

  it('zeigt Kopfbereich, Raster und Legende der Startvorlage', () => {
    renderApp();

    expect(screen.getByRole('heading', { name: /Halbklasse blau/ })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Mittwoch' })).toBeTruthy();
    expect(screen.getByRole('rowheader', { name: '08:20 – 09:05' })).toBeTruthy();

    expect(screen.getByRole('heading', { name: 'Legende' })).toBeTruthy();
    expect(screen.getByText('Textiles und Technisches Gestalten')).toBeTruthy();
    // IF steht in der Legende, obwohl es im Raster nicht vorkommt.
    expect(screen.getByText('Integrative Förderung')).toBeTruthy();
  });

  it('stellt das Band über die ganze Woche als eine Zelle dar', () => {
    const { container } = renderApp();
    const band = container.querySelector('.grid-cell--band');
    expect(band?.getAttribute('colspan')).toBe('5');
  });

  it('markiert gesperrte Zellen als «kein Unterricht»', () => {
    renderApp();
    expect(screen.getAllByRole('button', { name: /Mittwoch.*kein Unterricht/ }).length).toBe(3);
  });

  it('öffnet den Zellen-Editor beim Antippen und setzt eine Lektion', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: 'Freitag, 08:20 – 09:05: leer' }));

    const dialog = screen.getByRole('dialog', { name: 'Freitag, 08:20 – 09:05' });
    await user.click(within(dialog).getByRole('button', { name: /Integrative Förderung/ }));

    expect(screen.getByRole('button', { name: 'Freitag, 08:20 – 09:05: Integrative Förderung' })).toBeTruthy();
  });

  it('blendet in der Vorschau die Palette aus', async () => {
    const user = userEvent.setup();
    const { container } = renderApp();

    expect(screen.getByRole('region', { name: 'Lektionsarten' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Vorschau' }));

    expect(screen.queryByRole('region', { name: 'Lektionsarten' })).toBeNull();
    expect(container.querySelector('.app--preview')).toBeTruthy();
  });
});
