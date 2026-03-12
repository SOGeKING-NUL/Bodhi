"""Test Gemini and Sarvam APIs before running the full voice loop."""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# --- 1. Test Gemini ---
GEMINI_MODELS = [
    "gemini-3.1-flash-lite-preview", 
    "gemini-3.1-pro-preview", #tier1
    "gemini-2.5-flash",
    "gemini-2.5-pro", #tier1
]

def test_gemini():
    from langchain_google_genai import ChatGoogleGenerativeAI
    api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("SKIP Gemini: GOOGLE_API_KEY not set")
        return
    print("Testing Gemini...")
    for model in GEMINI_MODELS:
        try:
            llm = ChatGoogleGenerativeAI(model=model, google_api_key=api_key)
            response = llm.invoke("Say 'Hello from Bodhi' in exactly 5 words.")
            print(f"  Model {model}: {response.content}")
            print("  Gemini OK\n")
            return
        except Exception as e:
            print(f"  Model {model} failed: {e}")
    print("  All Gemini models failed.\n")


# --- 2. Test Sarvam STT (Saaras) ---
def test_sarvam_stt():
    from sarvamai import SarvamAI
    api_key = os.getenv("SARVAM_API_KEY")
    if not api_key:
        print("SKIP Sarvam STT: SARVAM_API_KEY not set")
        return
    audio_path = Path(__file__).parent / "audio.ogg"
    if not audio_path.exists():
        print(f"SKIP Sarvam STT: {audio_path} not found")
        return
    print("Testing Sarvam STT (Saaras)...")
    client = SarvamAI(api_subscription_key=api_key)
    with open(audio_path, "rb") as f:
        response = client.speech_to_text.transcribe(
            file=f,
            model="saaras:v3",
            mode="transcribe",
            language_code="en-IN",
        )
    transcript = getattr(response, "transcript", None) or getattr(response, "text", None) or str(response)
    print(f"  Transcript: {transcript}")
    print("  Sarvam STT OK\n")


if __name__ == "__main__":
    test_gemini()
    test_sarvam_stt()
    print("Done.")
