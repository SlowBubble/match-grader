import json

def extract_messages(chat_file):
    with open(chat_file, 'r') as f:
        data = json.load(f)
    
    messages = []
    for request in data.get('requests', []):
        text = request.get('message', {}).get('text', '')
        if text:
            messages.append(text)
    
    # Write one message per line
    with open('chat_compressed.json', 'w') as f:
        json.dump(messages, f, indent=2)
        f.write('\n')

if __name__ == '__main__':
    extract_messages('chat.json')
