"""
CRUD операции для долгов: получение, добавление, закрытие.
Действие передаётся через ?action=list|create|toggle|delete&id=N
Админ может передать ?user_id=N чтобы работать с долгами другого пользователя.
"""
import json
import os
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def get_user_by_token(conn, token: str):
    cur = conn.cursor()
    cur.execute(
        "SELECT u.id, u.is_admin FROM t_p42051059_debt_website_creatio.sessions s "
        "JOIN t_p42051059_debt_website_creatio.users u ON u.id = s.user_id WHERE s.token = %s",
        (token,)
    )
    row = cur.fetchone()
    return (row[0], row[1]) if row else (None, False)

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    method = event.get('httpMethod', 'GET')
    token = (event.get('headers') or {}).get('X-Auth-Token', '')
    params = event.get('queryStringParameters') or {}
    action = params.get('action', 'list')
    debt_id = params.get('id')
    target_user_id = params.get('user_id')

    if not token:
        return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}

    conn = get_conn()
    try:
        user_id, is_admin = get_user_by_token(conn, token)
        if not user_id:
            return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Сессия истекла'})}

        # Определяем чьи долги смотрим/меняем
        # Если передан user_id — только админ может использовать чужой
        if target_user_id and int(target_user_id) != user_id:
            if not is_admin:
                return {'statusCode': 403, 'headers': CORS, 'body': json.dumps({'error': 'Нет доступа'})}
            effective_user_id = int(target_user_id)
        else:
            effective_user_id = user_id

        cur = conn.cursor()

        # GET ?action=list — список долгов
        if action == 'list' and method == 'GET':
            # Если админ и не передан user_id — возвращаем все долги всех пользователей
            if is_admin and not target_user_id:
                cur.execute(
                    "SELECT d.id, d.name, d.amount, d.due_date, d.type, d.category, d.note, d.paid, d.created_at, "
                    "u.id as uid, u.name as uname, u.email "
                    "FROM t_p42051059_debt_website_creatio.debts d "
                    "JOIN t_p42051059_debt_website_creatio.users u ON u.id = d.user_id "
                    "ORDER BY d.created_at DESC"
                )
                rows = cur.fetchall()
                debts = [{
                    'id': r[0], 'name': r[1], 'amount': float(r[2]),
                    'dueDate': r[3].isoformat(), 'type': r[4], 'category': r[5],
                    'note': r[6] or '', 'paid': r[7], 'createdAt': r[8].isoformat(),
                    'owner': {'id': r[9], 'name': r[10], 'email': r[11]}
                } for r in rows]
            else:
                cur.execute(
                    "SELECT id, name, amount, due_date, type, category, note, paid, created_at "
                    "FROM t_p42051059_debt_website_creatio.debts WHERE user_id = %s ORDER BY created_at DESC",
                    (effective_user_id,)
                )
                rows = cur.fetchall()
                debts = [{
                    'id': r[0], 'name': r[1], 'amount': float(r[2]),
                    'dueDate': r[3].isoformat(), 'type': r[4], 'category': r[5],
                    'note': r[6] or '', 'paid': r[7], 'createdAt': r[8].isoformat()
                } for r in rows]
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'debts': debts})}

        # POST ?action=create — создать долг (только админ или сам себе)
        if action == 'create' and method == 'POST':
            body = json.loads(event.get('body') or '{}')
            cur.execute(
                "INSERT INTO t_p42051059_debt_website_creatio.debts (user_id, name, amount, due_date, type, category, note) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
                (effective_user_id, body['name'], body['amount'], body['dueDate'],
                 body['type'], body.get('category', 'Личное'), body.get('note', ''))
            )
            new_id = cur.fetchone()[0]
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'id': new_id})}

        # POST ?action=toggle&id=N — переключить paid
        # Админ может менять любой долг, обычный — только свой
        if action == 'toggle' and method == 'POST' and debt_id:
            if is_admin:
                cur.execute(
                    "UPDATE t_p42051059_debt_website_creatio.debts SET paid = NOT paid WHERE id = %s",
                    (int(debt_id),)
                )
            else:
                cur.execute(
                    "UPDATE t_p42051059_debt_website_creatio.debts SET paid = NOT paid WHERE id = %s AND user_id = %s",
                    (int(debt_id), user_id)
                )
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        # POST ?action=delete&id=N — удалить долг
        if action == 'delete' and method == 'POST' and debt_id:
            if is_admin:
                cur.execute(
                    "UPDATE t_p42051059_debt_website_creatio.debts SET paid = TRUE WHERE id = %s",
                    (int(debt_id),)
                )
            else:
                cur.execute(
                    "UPDATE t_p42051059_debt_website_creatio.debts SET paid = TRUE WHERE id = %s AND user_id = %s",
                    (int(debt_id), user_id)
                )
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}
    finally:
        conn.close()
