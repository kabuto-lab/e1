# Architecture Decision Records

Журнал архитектурных решений проекта. Каждая запись — неизменяема после принятия;
новые решения, меняющие старые, добавляются отдельной записью со ссылкой на предыдущую.

---

## ADR-002: T-Bank как адаптер над общей escrow state machine

**Статус:** Принято
**Дата:** 2026-06-16
**Эпик:** 5.15 (фиат-адаптер), ускоренный план T-Bank

### Контекст

Платформа уже имеет рабочую эскроу-систему для TON USDT (`escrow_transactions`,
`pending_funding → funded → hold_period → released/refunded`, плюс
disputed/in_flight состояния). Нужно добавить приём фиатных платежей через
T-Bank (Tinkoff) Acquiring API, не дублируя бизнес-логику холда/выплаты/возврата.

Альтернативы:
1. **Отдельная подсистема** — свой набор таблиц, свой контроллер, свой state machine
   для T-Bank, синхронизация с основным эскроу вручную.
2. **Адаптер** — T-Bank подключается как ещё один `paymentProvider` к существующей
   `escrow_transactions`; T-Bank-специфичные данные (order id, payment url, raw
   webhook payload) живут в отдельной join-таблице `tbank_orders`, но статус
   и переходы остаются в общей машине состояний.

### Решение

Выбран **адаптер** (вариант 2), по аналогии с тем, как уже сделан TON USDT.

- `escrow_transactions.payment_provider` получает значение `'tbank'`.
- Создаётся таблица `tbank_orders` (1:1 к `escrow_transactions` через FK) —
  только T-Bank-специфичные поля: `tbank_order_id`, `tbank_payment_id`,
  `terminal_key`, `payment_url`, `last_webhook_token` (для верификации
  вебхуков), `status` (статусы T-Bank), `raw_init_payload`/`raw_webhook_payload`.
- `TbankEscrowService` — единственное место, которое знает про T-Bank API
  (`Init`, `GetState`, `Confirm`, `Cancel`, webhook-нотификации). Наружу он
  отдаёт переходы в терминах общей машины состояний (`funded`, `released`,
  `refunded`), а не в терминах T-Bank.
- Webhook от T-Bank проверяется по токену (SHA-256 подпись согласно
  протоколу T-Bank: `Token = SHA256(sorted params + Password)`), затем
  маппится в `EscrowTransaction['status']` и применяется через существующий
  `EscrowService.updateStatus()` / `confirmFunding()` / `release()` / `refund()`.

### Последствия

**Плюсы:**
- Один источник правды по статусу брони/эскроу для UI и аудита — независимо
  от провайдера (TON, T-Bank, legacy fiat-заглушка).
- Дублирования бизнес-правил (hold period, dispute, idempotency вебхуков) нет —
  они уже решены для TON и переиспользуются.
- Новый провайдер не требует изменений в `BookingsService` или фронтовых
  компонентах статуса — они уже работают по `escrow_transactions.status`.

**Минусы / риски:**
- `tbank_orders` — новая spine-таблица, миграции (`0017_tbank_escrow.sql`,
  `0018_tbank_terminal_key.sql`) требуют отдельного ок оператора.
- T-Bank-специфичные статусы (`NEW`, `CONFIRMED`, `REJECTED`, `PARTIAL_REFUNDED`
  и т.д.) надо явно смаппить на общий enum — несовпадение семантики (например
  T-Bank `AUTHORIZED` ≠ наш `funded`, если используется двухстадийный платёж)
  нужно зафиксировать в коде маппера и покрыть тестами. **Открытый вопрос:**
  `REJECTED` по плану должен маппиться в `failed`, которого нет в общем enum
  `escrow_transactions.status` — решение откладывается на День 3 (`TBankClient`
  маппинг статусов).
- Idempotency вебхуков T-Bank (повторные нотификации) обрабатывается так же,
  как у TON-индексера — через уникальный `tbank_order_id` + проверку текущего
  статуса перед переходом.

### Связанные документы

- `packages/db/src/schema/escrow.ts` — общая state machine.
- `packages/db/src/schema/tbank-orders.ts` — схема `tbank_orders`.
- `apps/api/src/escrow/ton-escrow.service.ts` — референсная реализация адаптера для TON.
- `apps/api/src/escrow/tbank-escrow.service.ts` — скелет адаптера T-Bank.
