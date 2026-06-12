-- Split the SalonMassage site into its own tenant and rebrand the imperiumspa
-- tenant as "Imperium". The two sites used to share one tenant row (slug
-- imperiumspa, name SalonMassage). Idempotent — safe to re-run on any environment.

-- 1) imperiumspa now represents the Imperium brand (slug unchanged, name fixed).
UPDATE tenants
   SET name = 'Imperium', updated_at = now()
 WHERE slug = 'imperiumspa' AND name <> 'Imperium';
--> statement-breakpoint

-- 2) New standalone SalonMassage tenant. Clones config/settings (landingContent)
--    from imperiumspa so the brand/landing carry over; gets its own slug/domain.
INSERT INTO tenants (
  slug, name, legal_name, status, plan_id, primary_domain,
  contact_email, contact_phone, timezone, locale, settings,
  bootstrap_source_url, custom_domain, site_type
)
SELECT
  'salonmassage', 'SalonMassage', src.legal_name, 'active', src.plan_id, 'salonmassage.ru',
  'admin@salonmassage.ru', src.contact_phone, src.timezone, src.locale, src.settings,
  src.bootstrap_source_url, src.custom_domain, src.site_type
FROM tenants src
WHERE src.slug = 'imperiumspa'
  AND NOT EXISTS (SELECT 1 FROM tenants t WHERE t.slug = 'salonmassage');
