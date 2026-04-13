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
        "SELECT u.id, u.name, u.email, u.telegram_chat_id FROM t_p42051059_debt_website_creatio.sessions s "
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
                "INSERT INTO t_p42051059_debt_website_creatio.users (name, email, password_hash) VALUES (%s, %s, %s) RETURNING id, name, email",
                (name, email, pw_hash)
            )
            user = cur.fetchone()
            session_token = secrets.token_hex(32)
            cur.execute(
                "INSERT INTO t_p42051059_debt_website_creatio.sessions (user_id, token) VALUES (%s, %s)",
                (user[0], session_token)
            )
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'token': session_token, 'user': {'id': user[0], 'name': user[1], 'email': user[2]}})}

        # POST ?action=login
        if action == 'login' and method == 'POST':
            body = json.loads(event.get('body') or '{}')
            email = body.get('email', '').strip().lower()
            password = body.get('password', '')
            cur = conn.cursor()
            cur.execute(
                "SELECT id, name, email FROM t_p42051059_debt_website_creatio.users WHERE email = %s AND password_hash = %s",
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
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'token': session_token, 'user': {'id': user[0], 'name': user[1], 'email': user[2]}})}

        # GET ?action=me
        if action == 'me' and method == 'GET':
            if not token:
                return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}
            user = get_user_by_token(conn, token)
            if not user:
                return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Сессия истекла'})}
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'user': {'id': user[0], 'name': user[1], 'email': user[2], 'telegram_chat_id': user[3]}})}

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

        return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}
    finally:
        conn.close()
