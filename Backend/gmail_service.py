import base64
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = [
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
]

def authenticate_gmail():
    flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
    creds = flow.run_local_server(port=8080)
    return build('gmail', 'v1', credentials=creds)


def get_messages(service, query='is:unread'):
    messages = []
    next_page = None

    while True:
        results = service.users().messages().list(
            userId='me',
            q=query,
            maxResults=50,
            pageToken=next_page
        ).execute()

        messages.extend(results.get('messages', []))
        next_page = results.get('nextPageToken')

        if not next_page:
            break

    return messages

def _get_header(headers, name):
    if not headers:
        return ''
    for header in headers:
        if header.get('name', '').lower() == name.lower():
            return header.get('value', '')
    return ''


def _extract_text(payload):
    if not payload:
        return ''

    mime_type = payload.get('mimeType', '')
    body = payload.get('body', {})

    if mime_type == 'text/plain' and body.get('data'):
        return base64.urlsafe_b64decode(body.get('data')).decode('utf-8', errors='ignore')

    for part in payload.get('parts', []):
        text = _extract_text(part)
        if text:
            return text

    return ''


def read_message(service, msg_id):
    msg = service.users().messages().get(
        userId='me',
        id=msg_id,
        format='full'
    ).execute()

    payload = msg.get('payload', {})
    headers = payload.get('headers', [])

    subject = _get_header(headers, 'Subject')
    sender = _get_header(headers, 'From')
    body = _extract_text(payload) or msg.get('snippet', '')

    return {
        'id': msg_id,
        'threadId': msg.get('threadId'),
        'subject': subject,
        'from': sender,
        'body': body,
        'snippet': msg.get('snippet', ''),
    }
