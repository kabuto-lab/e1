import { asset } from '@/lib/asset';
import '@/styles/salonmassage.css';
import type { ReactNode } from 'react';
import { SmHeader } from './SmHeader';
import { SmFooter } from './SmFooter';
import { SmAgeGate } from './SmAgeGate';

/**
 * SmGlobalPage — шаблон сквозной глобальной страницы (Class-G) в шелле
 * SalonMassage: Мальчишник / Выезд / Вакансии. Контент пока статичный (одинаков
 * на всех салонах). TODO: вынести в NAS-управляемое глобальное хранилище
 * (схема Class-G + admin), чтобы platform-admin правил один раз для всех.
 */
export function SmGlobalPage({
  kicker,
  title,
  lead,
  children,
  cta = 'Записаться',
}: {
  kicker: string;
  title: string;
  lead: string;
  children?: ReactNode;
  cta?: string;
}) {
  return (
    <div className="sm-site" id="top">
      <SmAgeGate />
      <SmHeader />
      <main className="listing">
        <div className="wrap center">
          <div className="kicker">{kicker}</div>
          <div className="stitle">{title}</div>
          <p className="lead">{lead}</p>
          {children}
          <div style={{ marginTop: 40 }}>
            <a href={asset("/imperiumspa#contacts")} className="shiny-cta">
              <i className="blind" />
              <span>{cta}</span>
            </a>
          </div>
        </div>
      </main>
      <SmFooter />
    </div>
  );
}
