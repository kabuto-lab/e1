-- Seed tenant_touchpoints из headless-рендер-скана доноров (touchpoints-render.json).
-- Идемпотентно: ON CONFLICT (tenant_id,key) DO UPDATE. НЕ миграция — повторяемый seed.
-- Запуск: Get-Content seed-touchpoints.sql | docker compose -f docker-compose.dev.yml exec -T postgres psql -U postgres -d barbie_site1
WITH d(slug, key, enabled, label, val) AS (VALUES
  -- 5massage (vanilia)
  ('5massage','callWidget',true,'Позвонить','+7 912 076-72-23'),
  ('5massage','telegram',true,'Telegram','@Vaniliamassage'),
  ('5massage','operator',true,'Написать оператору','@happy_end_guest_1'),
  -- barbiespa
  ('barbiespa','callWidget',true,'Позвонить','+7 499 520-03-10'),
  ('barbiespa','telegram',true,'Telegram','@Barbie_Spa'),
  ('barbiespa','operator',true,'Написать оператору','@happy_end_guest'),
  ('barbiespa','footer',true,'Контакты','https://barbiespa.ru/kontaktyi/'),
  -- eroticmassaj (podium)
  ('eroticmassaj','callWidget',true,'Позвонить','+7 499 430-83-79'),
  ('eroticmassaj','telegram',true,'Telegram','@PodiumSpa25'),
  ('eroticmassaj','operator',true,'Написать оператору','@happy_end_guest'),
  ('eroticmassaj','quiz',true,'Подобрать','#quiz'),
  ('eroticmassaj','footer',true,'Контакты','https://eroticmassaj.ru/contacts/'),
  -- etalonspa
  ('etalonspa','callWidget',true,'Позвонить','+7 499 520-08-89'),
  ('etalonspa','telegram',true,'Telegram','@etalonspaforman'),
  ('etalonspa','operator',true,'Написать в WhatsApp','https://wa.me/79269524822'),
  ('etalonspa','quiz',true,'Подобрать','#quiz'),
  ('etalonspa','popup',true,'Наши девушки теперь в Telegram','https://t.me/m5massage_girls_bot'),
  -- dachaspa
  ('dachaspa','callWidget',true,'Позвонить','+7 495 159-14-76'),
  ('dachaspa','telegram',true,'Telegram','@dachaspa'),
  ('dachaspa','popup',true,'Сладкие часы — счастливые часы','https://wa.clck.bar/79060309050'),
  -- imperiumspa (salonmassage — ПИЛОТ, полный набор)
  ('imperiumspa','callWidget',true,'Позвонить','+7 495 837-22-46'),
  ('imperiumspa','telegram',true,'Telegram','@Imperium_spa5'),
  ('imperiumspa','operator',true,'Написать в WhatsApp','https://wa.me/79168657931'),
  ('imperiumspa','booking',true,'Записаться на сеанс','#contacts'),
  ('imperiumspa','footer',true,'Контакты','https://imperiumspa.ru/contacts/'),
  ('imperiumspa','quiz',true,'Подобрать','#quiz'),
  ('imperiumspa','popup',true,'Запишитесь со скидкой 20% на первый визит','https://wa.me/79168657931'),
  -- massazh-dlya-par (TenantSiteShell — не salonmassage, но точки заполним)
  ('massazh-dlya-par','callWidget',true,'Позвонить','+7 916 007-32-59'),
  ('massazh-dlya-par','telegram',true,'Telegram','@barbiespa69'),
  ('massazh-dlya-par','booking',true,'Забронировать','https://massazh-dlya-par.ru/zabronirovat/'),
  ('massazh-dlya-par','popup',true,'Массаж для пар — спецпрограмма','https://wa.clck.bar/79160073259'),
  -- nebesaspa
  ('nebesaspa','callWidget',true,'Позвонить','+7 912 076-78-14'),
  ('nebesaspa','telegram',true,'Telegram','@NebosvodSpa'),
  -- outcall-massage
  ('outcall-massage','telegram',true,'Telegram','@etalonspaforman'),
  ('outcall-massage','operator',true,'Написать в WhatsApp','https://wa.me/79002485145'),
  -- roxy-spa
  ('roxy-spa','callWidget',true,'Позвонить','+7 912 076-95-03'),
  ('roxy-spa','telegram',true,'Telegram','@barbie_spa'),
  ('roxy-spa','operator',true,'Написать оператору','@happy_end_guest_1'),
  ('roxy-spa','booking',true,'Записаться','https://wa.clck.bar/79168661768'),
  -- soho-spa
  ('soho-spa','callWidget',true,'Позвонить','+7 912 076-97-90'),
  ('soho-spa','telegram',true,'Telegram','@sohospa_moscow'),
  ('soho-spa','operator',true,'Написать оператору','@happy_end_guest_1'),
  ('soho-spa','booking',true,'Записаться','https://wa.clck.bar/79168660867'),
  ('soho-spa','quiz',true,'Подобрать','#quiz'),
  -- pentagon
  ('pentagon','callWidget',true,'Позвонить','+7 912 076-97-49'),
  ('pentagon','telegram',true,'Telegram','@Pentagonspa')
)
INSERT INTO tenant_touchpoints (tenant_id, key, enabled, label, value)
SELECT t.id, d.key, d.enabled, d.label, d.val
FROM d JOIN tenants t ON t.slug = d.slug
ON CONFLICT (tenant_id, key) DO UPDATE
  SET enabled = EXCLUDED.enabled,
      label   = EXCLUDED.label,
      value   = EXCLUDED.value,
      updated_at = now();
