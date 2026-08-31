import re
from groq_client import generate_reply as groq_generate_reply

STANDARD_LABEL_PATTERNS = {
    "Payment 💰": ["invoice", "payment", "bill", "transaction", "refund"],
    "Action Required ⚠️": ["urgent", "asap", "immediately", "action required"],
    "High Priority 🔴": ["important", "priority", "critical"],
    "Follow-up 🔁": ["follow up", "reminder", "pending"],
    "Approval Needed ✅": ["approve", "approval needed"],
    "Work 📘": ["project", "update", "task", "assignment"],
    "Meeting 📅": ["meeting", "schedule", "appointment"],
    "Deadline ⏳": ["deadline", "due date"],
    "Notification 🔔": ["alert", "notification", "notice"],
    "Security Alert 🔒": ["security", "password", "login attempt"],
    "Promotional 🟡": ["offer", "discount", "sale", "deal", "promo"],
    "Newsletter 📰": ["newsletter", "subscribe"],
    "Order / Delivery 📦": ["order", "shipment", "delivery", "tracking"],
    "Booking 🎫": ["booking", "reservation", "ticket"],
    "Personal 💬": ["hi", "hello", "regards", "how are you"],
    "Greetings 🎉": ["happy birthday", "congratulations"],
    "Spam 🚫": ["unsubscribe", "spam"],
    "FYI ℹ️": ["fyi", "for your information"],
}

TEAM_KEYWORDS = {
    "sales": ["sales", "deal", "proposal", "pricing", "quote"],
    "support": ["support", "help", "issue", "ticket", "problem"],
    "engineering": ["bug", "error", "deploy", "release", "feature"]
}


def _normalize_text(text):
    if not text:
        return ""
    return re.sub(r"\s+", " ", text).strip().lower()


def _matches_keywords(text, keywords):
    if not keywords:
        return False
    lower_text = _normalize_text(text)
    return any(keyword.strip().lower() in lower_text for keyword in keywords if keyword.strip())


def _parse_labels_from_text(text):
    text = text.strip()
    if not text:
        return []
    return [label.strip() for label in re.split(r"[,;\n]+", text) if label.strip()]


def _ai_label_suggestion(text):
    prompt = (
        "Read the following email and suggest one or more of these labels: "
        + ", ".join(STANDARD_LABEL_PATTERNS.keys())
        + ". Return only the label names separated by commas or new lines. "
        + f"Email: {text}"
    )
    try:
        result = groq_generate_reply(prompt, max_tokens=60, temperature=0.2)
        return _parse_labels_from_text(result)
    except Exception:
        return []

def classify_email(text, manual_rules=None, use_ai=True):
    text = _normalize_text(text)
    text_lower = text
    labels = []

    if manual_rules:
        for rule in manual_rules:
            if not isinstance(rule, dict) or not rule.get("active", True):
                continue
            if _matches_keywords(text, rule.get("keywords", [])):
                label = rule.get("label") or "Manual Label"
                labels.append(label)

    # 💰 Finance
    if any(word in text_lower for word in ["invoice", "payment", "bill", "transaction", "refund"]):
        labels.append("Payment 💰")

    # ⚠️ Actions
    if any(word in text_lower for word in ["urgent", "asap", "immediately", "action required"]):
        labels.append("Action Required ⚠️")

    if any(word in text_lower for word in ["important", "priority", "critical"]):
        labels.append("High Priority 🔴")

    if any(word in text_lower for word in ["follow up", "reminder", "pending"]):
        labels.append("Follow-up 🔁")

    if any(word in text_lower for word in ["approve", "approval needed"]):
        labels.append("Approval Needed ✅")

    # 💼 Work
    if any(word in text_lower for word in ["project", "update", "task", "assignment"]):
        labels.append("Work 📘")

    if any(word in text_lower for word in ["meeting", "schedule", "appointment"]):
        labels.append("Meeting 📅")

    if any(word in text_lower for word in ["deadline", "due date"]):
        labels.append("Deadline ⏳")

    # 🔔 Notifications
    if any(word in text_lower for word in ["alert", "notification", "notice"]):
        labels.append("Notification 🔔")

    if any(word in text_lower for word in ["security", "password", "login attempt"]):
        labels.append("Security Alert 🔒")

    # 🛍️ Promotions
    if any(word in text_lower for word in ["offer", "discount", "sale", "deal", "promo"]):
        labels.append("Promotional 🟡")

    if any(word in text_lower for word in ["newsletter", "subscribe"]):
        labels.append("Newsletter 📰")

    # 📦 Orders
    if any(word in text_lower for word in ["order", "shipment", "delivery", "tracking"]):
        labels.append("Order / Delivery 📦")

    if any(word in text_lower for word in ["booking", "reservation", "ticket"]):
        labels.append("Booking 🎫")

    # 👥 Personal
    if any(word in text_lower for word in ["hi", "hello", "regards", "how are you"]):
        labels.append("Personal 💬")

    if any(word in text_lower for word in ["happy birthday", "congratulations"]):
        labels.append("Greetings 🎉")

    # 🧹 Low priority
    if any(word in text_lower for word in ["unsubscribe", "spam"]):
        labels.append("Spam 🚫")

    if any(word in text_lower for word in ["fyi", "for your information"]):
        labels.append("FYI ℹ️")

    if use_ai:
        ai_labels = _ai_label_suggestion(text)
        for suggested in ai_labels:
            if suggested and suggested not in labels and suggested in STANDARD_LABEL_PATTERNS:
                labels.append(suggested)

    # Default
    if not labels:
        labels.append("No Action Required ✅")

    return list(dict.fromkeys(labels))