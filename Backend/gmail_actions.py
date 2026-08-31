import base64
from email.mime.text import MIMEText

def get_or_create_label(service, label_name):
    labels = service.users().labels().list(userId='me').execute().get('labels', [])

    for label in labels:
        if label['name'] == label_name:
            return label['id']

    # 🆕 Create label if not found
    new_label = service.users().labels().create(
        userId='me',
        body={
            'name': label_name,
            'labelListVisibility': 'labelShow',
            'messageListVisibility': 'show'
        }
    ).execute()

    return new_label['id']


def apply_label(service, msg_id, label_name):
    label_id = get_or_create_label(service, label_name)

    service.users().messages().modify(
        userId='me',
        id=msg_id,
        body={
            'addLabelIds': [label_id]
        }
    ).execute()


def create_raw_message(to_email, subject, body):
    message = MIMEText(body)
    message['to'] = to_email
    message['subject'] = subject
    raw_bytes = base64.urlsafe_b64encode(message.as_bytes())
    return raw_bytes.decode('utf-8')


def send_message(service, to_email, subject, body, thread_id=None):
    raw = create_raw_message(to_email, subject, body)
    message_body = {'raw': raw}
    if thread_id:
        message_body['threadId'] = thread_id
    return service.users().messages().send(userId='me', body=message_body).execute()


def forward_message(service, msg_id, forward_to):
    return service.users().messages().forward(
        userId='me',
        id=msg_id,
        body={'to': forward_to}
    ).execute()
