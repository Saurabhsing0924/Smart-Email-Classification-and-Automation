from gmail_service import authenticate_gmail, get_messages, read_message
from gmail_actions import apply_label
from classify import classify_email
from responder import generate_response
from auto_reply import send_reply

def run():
    service = authenticate_gmail()

    messages = get_messages(service)

    print(f"📩 Total emails found: {len(messages)}")

    for msg in messages:
        msg_id = msg['id']

        # 📥 Extract email text
        text = read_message(service, msg_id)

        if not text:
            continue

        # 🧠 Classify email
        labels = classify_email(text)

        print(f"\n📧 Email Preview: {text[:60]}")
        print(f"🏷 Labels: {labels}")

        # 🏷 Apply Gmail labels
        for label in labels:
            apply_label(service, msg_id, label)

        # 💬 Generate response
        response = generate_response(labels)

        # ⚠️ IMPORTANT: replace this later with real sender extraction
        sender_email = "your_email@gmail.com"

        send_reply(sender_email, "Auto Reply", response)

        print("✅ Processed email successfully")

if __name__ == "__main__":
    run()