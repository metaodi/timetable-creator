import type { TimetableConfig } from '../types/config';

export function PlanHeader({ config }: { config: TimetableConfig }) {
  return (
    <header className="plan-header">
      {config.meta.logoDataUrl ? (
        <img className="plan-header__logo" src={config.meta.logoDataUrl} alt="" />
      ) : null}
      <div className="plan-header__text">
        <h1 className="plan-header__title">{config.meta.title}</h1>
        {config.meta.subtitle ? (
          <p className="plan-header__subtitle">{config.meta.subtitle}</p>
        ) : null}
      </div>
    </header>
  );
}
