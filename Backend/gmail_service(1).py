from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ['https://www.googleapis.com/auth/gmail.modify']

def authenticate_gmail():
    flow = InstalledAppFlow.from_client_secrets_file(
        'credentials.json',
        SCOPES
    )
    creds = flow.run_local_server(port=8080)
    return build('gmail', 'v1', credentials=creds)


def get_messages(service):
    messages = []
    next_page = None

    while True:
        results = service.users().messages().list(
            userId='me',
            maxResults=50,
            pageToken=next_page
        ).execute()

        messages.extend(results.get('messages', []))
        next_page = results.get('nextPageToken')

        if not next_page:
            break

    return messages

import base64

def read_message(service, msg_id):
    msg = service.users().messages().get(
        userId='me',
        id=msg_id,
        format='full'
    ).execute()

    payload = msg.get('payload', {})
    parts = payload.get('parts', [])

    data = None

    # Try extracting from parts
    for part in parts:
        if part.get('mimeType') == 'text/plain':
            data = part['body'].get('data')
            if data:
                break

    # fallback
    if not data:
        data = payload.get('body', {}).get('data')

    if data:
        return base64.urlsafe_b64decode(data).decode('utf-8')

    return msg.get('snippet', '')