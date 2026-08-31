import json
import os

SETTINGS_PATH = os.path.join(os.path.dirname(__file__), 'settings.json')
DEFAULT_SETTINGS = {
    'forward_to': '',
    'label_rules': [],
    'forward_rules': [],
    'reply_templates': [
        {
            'id': 'template-1',
            'name': 'Quick Reply',
            'subject': 'Re: Your request',
            'body': 'Thanks for your email. I will review it and get back to you shortly.'
        },
        {
            'id': 'template-2',
            'name': 'Meeting Reply',
            'subject': 'Re: Meeting request',
            'body': 'Thank you for reaching out. Please let me know your availability so we can schedule a time.'
        }
    ],
    'team_forward': {
        'sales': {'email': '', 'enabled': False},
        'support': {'email': '', 'enabled': False},
        'engineering': {'email': '', 'enabled': False}
    },
    'ai_labeling_enabled': True,
    'ai_reply_enabled': True,
    'dismissed_warnings': []
}


def read_settings():
    if not os.path.exists(SETTINGS_PATH):
        return DEFAULT_SETTINGS.copy()

    try:
        with open(SETTINGS_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
        if not isinstance(data, dict):
            return DEFAULT_SETTINGS.copy()
        merged = {**DEFAULT_SETTINGS, **data}
        merged['label_rules'] = merged.get('label_rules', [])
        merged['forward_rules'] = merged.get('forward_rules', [])
        merged['reply_templates'] = merged.get('reply_templates', [])
        merged['team_forward'] = merged.get('team_forward', DEFAULT_SETTINGS['team_forward'])
        return merged
    except Exception:
        return DEFAULT_SETTINGS.copy()


def save_settings(settings):
    os.makedirs(os.path.dirname(SETTINGS_PATH), exist_ok=True)
    with open(SETTINGS_PATH, 'w', encoding='utf-8') as f:
        json.dump(settings, f, indent=2)
