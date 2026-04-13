"""
Отправка Telegram-уведомлений о приближающихся и просроченных долгах.
Вызывается по расписанию или вручную через GET /.
"""
import json
import os
import urllib.request
import urllib.parse
import psycopg2

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def send_tg(chat_id: int, text: str):
    token = os.environ['TELEGRAM_BOT_TOKEN']
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    data = json.dumps({'chat_id': chat_id, 'text': text, 'parse_mode': 'HTML'}).encode()
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    urllib.request.urlopen(req, timeout=10)

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    # Обработка webhook от Telegram (POST с update)
    if event.get('httpMethod') == 'POST':
        body = json.loads(event.get('body') or '{}')
        message = body.get('message', {})
        chat_id = message.get('chat', {}).get('id')
        text = message.get('text', '')
        if chat_id and text == '/start':
            token = os.environ['TELEGRAM_BOT_TOKEN']
            url = f"https://api.telegram.org/bot{token}/sendMessage"
            msg = (
                f"👋 Привет! Я бот <b>ДолгТрекера</b>.\n\n"
                f"Твой Telegram ID: <code>{chat_id}</code>\n\n"
                f"Скопируй этот ID и вставь в профиле приложения, чтобы получать уведомления о долгах."
            )
            data = json.dumps({'chat_id': chat_id, 'text': msg, 'parse_mode': 'HTML'}).encode()
            req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
            urllib.request.urlopen(req, timeout=10)
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

    # GET / — отправка уведомлений о долгах
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT d.id, d.name, d.amount, d.due_date, d.type, u.telegram_chat_id
            FROM t_p42051059_debt_website_creatio.debts d
            JOIN t_p42051059_debt_website_creatio.users u ON u.id = d.user_id
            WHERE d.paid = FALSE
              AND d.notified = FALSE
              AND u.telegram_chat_id IS NOT NULL
              AND d.due_date <= CURRENT_DATE + INTERVAL '3 days'
        """)
        rows = cur.fetchall()
        sent = 0
        for row in rows:
            debt_id, debt_name, amount, due_date, debt_type, chat_id = row
            days = (due_date - __import__('datetime').date.today()).days
            if days < 0:
                when = f"просрочен на {abs(days)} дн."
                emoji = "🚨"
            elif days == 0:
                when = "срок истекает СЕГОДНЯ"
                emoji = "⚠️"
            else:
                when = f"до срока {days} дн."
                emoji = "🔔"

            direction = "Ты должен" if debt_type == "owe" else "Тебе должны"
            text = (
                f"{emoji} <b>Напоминание о долге</b>\n\n"
                f"{direction}: <b>{debt_name}</b>\n"
                f"Сумма: <b>{int(amount):,} ₽</b>\n"
                f"Срок: {due_date.strftime('%d.%m.%Y')} ({when})"
            )
            send_tg(chat_id, text)
            cur.execute(
                "UPDATE t_p42051059_debt_website_creatio.debts SET notified = TRUE WHERE id = %s",
                (debt_id,)
            )
            sent += 1

        conn.commit()
        return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'sent': sent})}
    finally:
        conn.close()
