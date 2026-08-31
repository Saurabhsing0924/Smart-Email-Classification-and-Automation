from transformers import pipeline

classifier = pipeline(
    "text-classification",
    model="distilbert-base-uncased-finetuned-sst-2-english"
)

def classify_email(text):
    text_lower = text.lower()
    labels = []

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

    # 🧠 DistilBERT fallback
    result = classifier(text[:512])[0]

    if result["label"] == "NEGATIVE":
        if "Action Required ⚠️" not in labels:
            labels.append("Action Required ⚠️")

    # Default
    if not labels:
        labels.append("No Action Required ✅")

    return list(set(labels))