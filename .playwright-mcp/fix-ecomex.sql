UPDATE pages
SET html = regexp_replace(html, '(Ecomex</span></div>\s*<a href=")/categoria-produto/pisos-vinilicos(")', '\1/categoria-produto/pisos-vinilicos/ecomex\2'),
    updated_at = now()
WHERE slug = 'pisos' AND html ~ 'Ecomex</span></div>\s*<a href="/categoria-produto/pisos-vinilicos"';
SELECT substring(html from E'.{0,80}pisos-vinilicos.{0,30}') FROM pages WHERE slug='pisos';
