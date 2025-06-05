import os
import sys
import subprocess
import pickle
import google_auth_oauthlib.flow
import googleapiclient.discovery
import googleapiclient.errors
from googleapiclient.http import MediaFileUpload
from google.auth.transport.requests import Request
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Setup paths
CONFIG_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'config'))
CREDENTIALS_FILE = os.path.join(CONFIG_DIR, 'credentials_second.json')
TOKEN_FILE = os.path.join(CONFIG_DIR, 'token.pickle')
OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'done', 'instance2'))

# Ensure output folder exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Get input path from CLI or Node.js
if len(sys.argv) < 2:
    print(" Error: Missing input video path argument.")
    sys.exit(1)

input_path = sys.argv[1]
filename = os.path.basename(input_path)
converted_path = os.path.join(OUTPUT_DIR, filename)

def get_authenticated_service():
    scopes = ["https://www.googleapis.com/auth/youtube.upload"]
    creds = None

    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, 'rb') as token:
            creds = pickle.load(token)

    if creds and creds.expired and creds.refresh_token:
        try:
            creds.refresh(Request())
            print("🔁 Token refreshed successfully.")
        except Exception as e:
            print("⚠️ Token refresh failed. Re-authenticating...")
            creds = None

    if not creds or not creds.valid:
        flow = google_auth_oauthlib.flow.InstalledAppFlow.from_client_secrets_file(
            CREDENTIALS_FILE, scopes)
        creds = flow.run_local_server(port=0)  


    with open(TOKEN_FILE, 'wb') as token:
        pickle.dump(creds, token)

    return googleapiclient.discovery.build("youtube", "v3", credentials=creds)

def convert_video(input_path, output_path):
    print(f" Converting: {input_path}")
    command = [
        'ffmpeg', '-y',
        '-i', input_path,
        '-r', '30',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        output_path
    ]
    try:
        subprocess.run(command, check=True)
        print("✅ Video conversion successful.")
    except subprocess.CalledProcessError as e:
        print("❌ FFmpeg conversion failed:", e)
        sys.exit(1)

def upload_to_youtube(youtube, video_path, title):
    request_body = {
        'snippet': {
            'title': title,
            'description': title,
            'categoryId': '22'
        },
        'status': {
            'privacyStatus': 'private'
        }
    }

    media = MediaFileUpload(video_path, chunksize=-1, resumable=True)
    request = youtube.videos().insert(part="snippet,status", body=request_body, media_body=media)

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f" Upload progress: {int(status.progress() * 100)}%")

    print(f"✅ Uploaded to YouTube Account 2: https://youtu.be/{response['id']}")
    print(f"YouTube Video ID: {response['id']}")

def main():
    print(f"[START] Processing video: {filename}")
    convert_video(input_path, converted_path)
    print("[DONE] Conversion completed.")

    youtube = get_authenticated_service()
    upload_to_youtube(youtube, converted_path, filename)
    print(f" Moved uploaded file to: {converted_path}")

if __name__ == "__main__":
    main()
