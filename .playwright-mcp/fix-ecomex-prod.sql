SELECT source_id, name, path FROM catalog_categories WHERE slug = 'ecomex';
UPDATE pages
SET html = regexp_replace(html, '(Ecomex</span></div>\s*<a href=")/categoria-produto/pisos-vinilicos(")', '\1/categoria-produto/pisos-vinilicos/ecomex\2'),
    updated_at = now()
WHERE slug = 'pisos' AND html ~ 'Ecomex</span></div>\s*<a href="/categoria-produto/pisos-vinilicos"';
SELECT count(*) AS link_ok FROM pages WHERE slug='pisos' AND html LIKE '%pisos-vinilicos/ecomex%';
