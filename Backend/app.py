from flask import Flask, request, jsonify
from flask_cors import CORS
from classify import classify_email
from responder import generate_response
from gmail_service import authenticate_gmail
from gmail_actions import apply_label, forward_message
from settings import read_settings, save_settings

app = Flask(__name__)
CORS(app)


def _matches_keywords(text, keywords):
    if not keywords:
        return False
    lower_text = text.lower()
    return any(keyword.strip().lower() in lower_text for keyword in keywords if keyword.strip())


@app.route("/process-email", methods=["POST"])
def process_email():
    data = request.json or {}
    subject = data.get("subject", "")
    body = data.get("body", "")
    full_text = f"{subject}\n{body}".strip()

    settings = read_settings()
    labels = classify_email(
        full_text,
        manual_rules=settings.get("label_rules", []),
        use_ai=settings.get("ai_labeling_enabled", True)
    )
    auto_response = generate_response(
        subject,
        body,
        labels,
        use_ai=settings.get("ai_reply_enabled", True)
    )

    forward_matches = []
    for rule in settings.get("forward_rules", []):
        if isinstance(rule, dict) and rule.get("active", True):
            if _matches_keywords(full_text, rule.get("keywords", [])):
                target = rule.get("forward_to")
                if target:
                    forward_matches.append(target)

    team_forward = settings.get("team_forward", {})
    team_warnings = []
    for team, config in team_forward.items():
        if isinstance(config, dict) and not config.get("enabled", False):
            team_warnings.append(f"{team} forwarding is disabled")

    return jsonify({
        "labels": labels,
        "auto_response": auto_response,
        "forward_matches": list(dict.fromkeys(forward_matches)),
        "team_warnings": team_warnings,
        "settings": settings
    })


@app.route("/generate-reply", methods=["POST"])
def generate_reply_route():
    data = request.json or {}
    subject = data.get("subject", "")
    body = data.get("body", "")
    labels = data.get("labels", [])
    use_ai = data.get("use_ai", True)

    if not body:
        return jsonify({"error": "body is required"}), 400

    reply = generate_response(subject, body, labels, use_ai=use_ai)
    return jsonify({"reply": reply})


@app.route("/save-settings", methods=["POST"])
def save_settings_route():
    data = request.json or {}
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid settings payload"}), 400

    settings = read_settings()
    settings.update(data)
    save_settings(settings)

    return jsonify({"success": True, "settings": settings})


@app.route("/apply-label", methods=["POST"])
def apply_custom_label():
    data = request.json or {}
    msg_id = data.get("msg_id")
    label = data.get("label")
    if not msg_id or not label:
        return jsonify({"error": "msg_id and label are required"}), 400

    service = authenticate_gmail()
    apply_label(service, msg_id, label)

    return jsonify({"success": True, "msg_id": msg_id, "label": label})

@app.route("/set-forward", methods=["POST"])
def set_forward():
    data = request.json or {}
    forward_to = (data.get("forward_to") or "").strip()
    if not forward_to:
        return jsonify({"error": "forward_to is required"}), 400

    settings = read_settings()
    settings["forward_to"] = forward_to
    save_settings(settings)

    return jsonify({"success": True, "forward_to": forward_to})

@app.route("/forward-message", methods=["POST"])
def forward_message_route():
    data = request.json or {}
    msg_id = data.get("msg_id")
    forward_to = (data.get("forward_to") or "").strip() or read_settings().get("forward_to")

    if not msg_id or not forward_to:
        return jsonify({"error": "msg_id and forward_to are required"}), 400

    service = authenticate_gmail()
    forward_message(service, msg_id, forward_to)

    return jsonify({"success": True, "msg_id": msg_id, "forward_to": forward_to})

@app.route("/settings", methods=["GET"])
def get_settings():
    return jsonify(read_settings())

if __name__ == "__main__":
    print("Server starting...")
    app.run(port=5000, debug=True)