import re
from gmail_service import authenticate_gmail, get_messages, read_message
from gmail_actions import apply_label, forward_message, send_message
from classify import classify_email, TEAM_KEYWORDS
from responder import generate_response
from settings import read_settings

def _extract_email_address(from_header):
    if not from_header:
        return ''
    match = re.search(r'<([^>]+)>', from_header)
    return match.group(1).strip() if match else from_header.strip()


def _matches_keywords(text, keywords):
    if not keywords:
        return False
    lower_text = text.lower()
    return any(keyword.strip().lower() in lower_text for keyword in keywords if keyword.strip())


def run():
    service = authenticate_gmail()
    messages = get_messages(service)

    print(f"📩 Total emails found: {len(messages)}")

    settings = read_settings()
    default_forward_to = settings.get('forward_to', '')

    for msg in messages:
        msg_id = msg['id']
        email = read_message(service, msg_id)

        if not email or not email['body']:
            continue

        sender_email = _extract_email_address(email['from'])
        full_text = f"{email['subject']}\n{email['body']}"
        labels = classify_email(
            full_text,
            manual_rules=settings.get('label_rules', []),
            use_ai=settings.get('ai_labeling_enabled', True)
        )

        print(f"\n📧 Email subject: {email['subject']}")
        print(f"🏷 Labels: {labels}")

        for label in labels:
            apply_label(service, msg_id, label)

        response = generate_response(
            email['subject'],
            email['body'],
            labels,
            use_ai=settings.get('ai_reply_enabled', True)
        )
        reply_subject = f"Re: {email['subject']}" if email['subject'] else 'Re: Your message'

        if sender_email:
            send_message(service, sender_email, reply_subject, response, thread_id=email.get('threadId'))
            print(f"✉️ Replied to: {sender_email}")
        else:
            print("⚠️ Missing sender email address, skipping reply.")

        if default_forward_to:
            forward_message(service, msg_id, default_forward_to)
            print(f"➡️ Forwarded message to: {default_forward_to}")

        for rule in settings.get('forward_rules', []):
            if isinstance(rule, dict) and rule.get('active', True):
                if _matches_keywords(full_text, rule.get('keywords', [])):
                    target = rule.get('forward_to')
                    if target:
                        forward_message(service, msg_id, target)
                        print(f"➡️ Forwarded message to: {target}")

        for team, config in settings.get('team_forward', {}).items():
            if isinstance(config, dict) and config.get('enabled', False) and config.get('email'):
                team_keywords = TEAM_KEYWORDS.get(team, [])
                if _matches_keywords(full_text, team_keywords):
                    forward_message(service, msg_id, config['email'])
                    print(f"➡️ Team-forwarded message to {team}: {config['email']}")

        print("✅ Processed email successfully")

if __name__ == "__main__":
    run()