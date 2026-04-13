
CREATE TABLE t_p42051059_debt_website_creatio.users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    telegram_chat_id BIGINT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE t_p42051059_debt_website_creatio.debts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES t_p42051059_debt_website_creatio.users(id),
    name TEXT NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    due_date DATE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('owe', 'lend')),
    category TEXT NOT NULL DEFAULT 'Личное',
    note TEXT DEFAULT '',
    paid BOOLEAN DEFAULT FALSE,
    notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE t_p42051059_debt_website_creatio.sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES t_p42051059_debt_website_creatio.users(id),
    token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
