'use client';

import { useState } from 'react';

/** Простая клиентская форма заявки (без реального сабмита — заглушка под бронь). */
export function PentagonBookingForm() {
  const [sent, setSent] = useState(false);
  return (
    <form
      className="bform"
      onSubmit={(e) => { e.preventDefault(); setSent(true); }}
    >
      <input type="text" placeholder="Ваше имя" required />
      <input type="tel" placeholder="Телефон" required />
      <select defaultValue="">
        <option value="" disabled>Выберите программу</option>
        <option>Классический массаж</option>
        <option>SPA-программа</option>
        <option>Программа для двоих</option>
        <option>Мальчишник</option>
        <option>Выезд</option>
      </select>
      <input type="text" placeholder="Удобное время" />
      <button className="btn btn-accent" style={{ height: 50 }} type="submit">
        {sent ? 'Заявка отправлена ✓' : 'Записаться'}
      </button>
      <p style={{ fontSize: 12, color: 'var(--muted-2)', lineHeight: 1.5 }}>
        Нажимая «Записаться», вы соглашаетесь с обработкой данных. Сайт 18+.
      </p>
    </form>
  );
}
