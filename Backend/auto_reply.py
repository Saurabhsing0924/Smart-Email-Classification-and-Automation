from gmail_actions import send_message

def send_reply(service, to_email, subject, body, thread_id=None):
    return send_message(service, to_email, subject, body, thread_id)
