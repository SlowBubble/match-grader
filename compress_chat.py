import json
import os

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
        for msg in messages:
            f.write(json.dumps(msg) + '\n')
    
    # Delete the input file after processing
    os.remove(chat_file)

if __name__ == '__main__':
    extract_messages('chat.json')
