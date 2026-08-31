import json
import os
import urllib.request

GROQ_API_KEY = os.getenv('GROQ_API_KEY')
GROQ_API_URL = os.getenv('GROQ_API_URL', 'https://api.groq.ai/v1/generate')
GROQ_MODEL = os.getenv('GROQ_MODEL', 'groq-mini')


def generate_reply(prompt, max_tokens=256, temperature=0.7):
    if not GROQ_API_KEY:
        raise EnvironmentError('GROQ_API_KEY is required to generate replies.')

    body = {
        'model': GROQ_MODEL,
        'input': prompt,
        'temperature': temperature,
        'max_tokens': max_tokens,
    }

    headers = {
        'Authorization': f'Bearer {GROQ_API_KEY}',
        'Content-Type': 'application/json',
    }

    request = urllib.request.Request(
        GROQ_API_URL,
        data=json.dumps(body).encode('utf-8'),
        headers=headers,
        method='POST'
    )

    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.loads(response.read().decode('utf-8'))

    if isinstance(payload, dict):
        if 'text' in payload:
            return payload['text'].strip()
        if 'choices' in payload and payload['choices']:
            return payload['choices'][0].get('text', '').strip()
        if 'outputs' in payload and payload['outputs']:
            first = payload['outputs'][0]
            if isinstance(first, dict):
                return first.get('content', '').strip()
            return str(first).strip()

    return ''
