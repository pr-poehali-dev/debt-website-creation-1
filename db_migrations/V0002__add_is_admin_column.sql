ALTER TABLE t_p42051059_debt_website_creatio.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

UPDATE t_p42051059_debt_website_creatio.users SET is_admin = TRUE WHERE email = 'suckapupsik@gmail.com';
