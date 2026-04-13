"""
Авторизация пользователей: регистрация, вход, выход, получение профиля.
Действие передаётся через query-параметр: ?action=register|login|me|connect-telegram|logout
"""
import json
import os
import hashlib
import secrets
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def hash_password(pwd: str) -> str:
    return hashlib.sha256(pwd.encode()).hexdigest()

def get_user_by_token(conn, token: str):
    cur = conn.cursor()
    cur.execute(
        "SELECT u.id, u.name, u.email, u.telegram_chat_id, u.is_admin "
        "FROM t_p42051059_debt_website_creatio.sessions s "
        "JOIN t_p42051059_debt_website_creatio.users u ON u.id = s.user_id WHERE s.token = %s",
        (token,)
    )
    return cur.fetchone()

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    token = (event.get('headers') or {}).get('X-Auth-Token', '')
    params = event.get('queryStringParameters') or {}
    action = params.get('action', '')

    conn = get_conn()
    try:
        # POST ?action=register
        if action == 'register' and method == 'POST':
            body = json.loads(event.get('body') or '{}')
            name = body.get('name', '').strip()
            email = body.get('email', '').strip().lower()
            password = body.get('password', '')
            if not name or not email or not password:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Заполните все поля'})}
            cur = conn.cursor()
            cur.execute("SELECT id FROM t_p42051059_debt_website_creatio.users WHERE email = %s", (email,))
            if cur.fetchone():
                return {'statusCode': 409, 'headers': CORS, 'body': json.dumps({'error': 'Email уже зарегистрирован'})}
            pw_hash = hash_password(password)
            cur.execute(
                "INSERT INTO t_p42051059_debt_website_creatio.users (name, email, password_hash) VALUES (%s, %s, %s) RETURNING id, name, email, is_admin",
                (name, email, pw_hash)
            )
            user = cur.fetchone()
            session_token = secrets.token_hex(32)
            cur.execute(
                "INSERT INTO t_p42051059_debt_website_creatio.sessions (user_id, token) VALUES (%s, %s)",
                (user[0], session_token)
            )
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                'token': session_token,
                'user': {'id': user[0], 'name': user[1], 'email': user[2], 'is_admin': user[3]}
            })}

        # POST ?action=login
        if action == 'login' and method == 'POST':
            body = json.loads(event.get('body') or '{}')
            email = body.get('email', '').strip().lower()
            password = body.get('password', '')
            cur = conn.cursor()
            cur.execute(
                "SELECT id, name, email, is_admin FROM t_p42051059_debt_website_creatio.users WHERE email = %s AND password_hash = %s",
                (email, hash_password(password))
            )
            user = cur.fetchone()
            if not user:
                return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Неверный email или пароль'})}
            session_token = secrets.token_hex(32)
            cur.execute(
                "INSERT INTO t_p42051059_debt_website_creatio.sessions (user_id, token) VALUES (%s, %s)",
                (user[0], session_token)
            )
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                'token': session_token,
                'user': {'id': user[0], 'name': user[1], 'email': user[2], 'is_admin': user[3]}
            })}

        # GET ?action=me
        if action == 'me' and method == 'GET':
            if not token:
                return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}
            user = get_user_by_token(conn, token)
            if not user:
                return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Сессия истекла'})}
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                'user': {'id': user[0], 'name': user[1], 'email': user[2], 'telegram_chat_id': user[3], 'is_admin': user[4]}
            })}

        # POST ?action=connect-telegram
        if action == 'connect-telegram' and method == 'POST':
            if not token:
                return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}
            user = get_user_by_token(conn, token)
            if not user:
                return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Сессия истекла'})}
            body = json.loads(event.get('body') or '{}')
            chat_id = body.get('chat_id')
            cur = conn.cursor()
            cur.execute(
                "UPDATE t_p42051059_debt_website_creatio.users SET telegram_chat_id = %s WHERE id = %s",
                (chat_id, user[0])
            )
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        # POST ?action=logout
        if action == 'logout' and method == 'POST':
            if token:
                cur = conn.cursor()
                cur.execute("DELETE FROM t_p42051059_debt_website_creatio.sessions WHERE token = %s", (token,))
                conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        # GET ?action=users — только для админа
        if action == 'users' and method == 'GET':
            if not token:
                return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}
            user = get_user_by_token(conn, token)
            if not user or not user[4]:
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Нет доступа'})}
            cur = conn.cursor()
            cur.execute(
                "SELECT id, name, email, created_at FROM t_p42051059_debt_website_creatio.users ORDER BY created_at DESC"
            )
            rows = cur.fetchall()
            users = [{'id': r[0], 'name': r[1], 'email': r[2], 'created_at': r[3].isoformat()} for r in rows]
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'users': users})}

        return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}
    finally:
        conn.close()
