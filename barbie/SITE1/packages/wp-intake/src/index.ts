/**
 * @barbie-site1/wp-intake — WordPress → canonical-manifest intake.
 *
 * Harvested (deterministic front-half) from the standalone Replikant migrator
 * (RJ project): the WP → CanonicalManifest pipeline minus its code-generation,
 * GitHub-push, BullMQ orchestration and control-plane. NAS consumes this to
 * import WP sites into tenant content (cms_pages / media / menu / design tokens)
 * rather than to emit a standalone repo.
 *
 * Pure TypeScript, framework-agnostic (no Nest/DI) — usable from the API,
 * scripts, or a future worker.
 */
export * from './manifest';
export * from './ip-guard';
export * from './safe-fetch';
export * from './wxr-parser';
export * from './sql-dump-parser';
export * from './archive-extractor';
export * from './block-classifier';
export * from './design-extractor';
