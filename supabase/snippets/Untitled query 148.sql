WITH expected(table_name) AS (
  VALUES
    ('profiles'),
    ('categories'),
    ('museum_sections'),
    ('museum_items'),
    ('museum_item_specs'),
    ('gallery_images'),
    ('admin_user_operations')
)
SELECT
  e.table_name,
  CASE
    WHEN t.tablename IS NULL THEN 'MISSING'
    WHEN t.rowsecurity THEN 'RLS ENABLED'
    ELSE 'RLS DISABLED'
  END AS status
FROM expected e
LEFT JOIN pg_catalog.pg_tables t
  ON t.schemaname = 'public'
  AND t.tablename = e.table_name
ORDER BY e.table_name;