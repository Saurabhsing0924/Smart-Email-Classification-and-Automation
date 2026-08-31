def get_or_create_label(service, label_name):
    labels = service.users().labels().list(userId='me').execute().get('labels', [])

    # 🔍 Check if label already exists
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