'use client';

import { useState } from 'react';

/**
 * SmBookingForm — форма записи реплики SalonMassage (классы .field/.form-note).
 * Прототип: реального сабмита пока нет (как на статике) — показываем уведомление.
 */
export function SmBookingForm() {
  const [sent, setSent] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
    >
      <h3>Записаться на сеанс</h3>
      <div className="field">
        <label>Ваше имя</label>
        <input type="text" placeholder="Как к вам обращаться" />
      </div>
      <div className="field">
        <label>Телефон</label>
        <input type="tel" placeholder="+7 (___) ___-__-__" />
      </div>
      <div className="field">
        <label>Программа</label>
        <select>
          <option>Классический</option>
          <option>SPA</option>
          <option>VIP</option>
        </select>
      </div>
      <button className="shiny-cta" type="submit">
        <i className="blind" />
        <span>Отправить заявку</span>
      </button>
      <div className="form-note">
        {sent
          ? 'Это прототип — форма пока не отправляется.'
          : 'Нажимая кнопку, вы соглашаетесь с политикой конфиденциальности.'}
      </div>
    </form>
  );
}
