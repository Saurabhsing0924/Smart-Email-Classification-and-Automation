from groq_client import generate_reply as groq_generate_reply


def _static_response(labels):
    if "Payment 💰" in labels:
        return "Your payment request has been received and is being processed."

    if "Action Required ⚠️" in labels:
        return "We have received your request and will take immediate action."

    if "Meeting 📅" in labels:
        return "Meeting request noted. Please confirm your availability."

    if "Order / Delivery 📦" in labels:
        return "Your order is being processed and will be delivered soon."

    if "Promotional 🟡" in labels:
        return "Thank you for the offer. We will review it."

    if "Work 📘" in labels:
        return "Work update received. We will get back to you shortly."

    return "Thank you for your email. No action is required at this time."


def generate_response(subject, body, labels, use_ai=True, tone="polite and concise"):
    if not use_ai:
        return _static_response(labels)

    prompt = (
        "You are an email assistant. Compose a professional reply using the email context. "
        f"Subject: {subject}\n"
        f"Body: {body}\n"
        f"Detected labels: {', '.join(labels) if labels else 'none'}\n"
        f"Tone: {tone}. "
        "Write a response that matches the tone and mentions any required next steps. "
        "Return only the reply text."
    )

    try:
        reply = groq_generate_reply(prompt)
        if reply:
            return reply
    except Exception:
        pass

    return _static_response(labels)
