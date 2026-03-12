import os
import sys
import time
from dotenv import load_dotenv
import sounddevice as sd
from src.audio import record_until_enter, record_until_silence
from src.services.llm import get_reply
from src.services.stt import transcribe_audio
from src.services.tts import speak

load_dotenv()

# BODHI_VOICE_MODE=natural (VAD, no Enter) or manual (Enter to start/stop)
VOICE_MODE = (os.getenv("BODHI_VOICE_MODE") or "natural").strip().lower()

def main() -> None:
    sarvam_key = os.getenv("SARVAM_API_KEY")
    google_key = os.getenv("GOOGLE_API_KEY")
    if not sarvam_key:
        print("Error: SARVAM_API_KEY not set. Add it to .env (see .env.example)")
        sys.exit(1)
    if not google_key:
        print("Error: GOOGLE_API_KEY not set. Add it to .env")
        sys.exit(1)

    from src.audio import get_input_device

    dev = get_input_device()
    if dev is not None:
        print(f"Using input device: {dev}")
    else:
        default_idx = sd.default.device[0]
        devs = sd.query_devices()
        name = devs[default_idx]["name"] if default_idx < len(devs) else "default"
        print(f"Using input device: {default_idx} ({name})")
        print("  (Set BODHI_INPUT_DEVICE in .env to override. Run: python -c \"from src.audio import list_input_devices; list_input_devices()\" to list devices)")
    print("=" * 50)
    print("Bodhi Phase 0 — Voice Loop")
    print("Speak in Hindi, English, or Hinglish.")
    if VOICE_MODE == "manual":
        print("Press Enter to start recording, Enter again to stop.")
    else:
        print("Just speak — stops automatically after ~1s silence.")
    print("Ctrl+C to exit.")
    print("=" * 50)

    history: list[dict] = []

    while True:
        try:
            device = get_input_device()
            if VOICE_MODE == "manual":
                audio_bytes = record_until_enter(device=device)
            else:
                # Natural: VAD-based, no Enter. Brief delay after previous TTS to avoid echo.
                time.sleep(0.5)
                audio_bytes = record_until_silence(
                    wait_for_enter=False,
                    silence_duration_ms=1500,
                    vad_aggressiveness=3,
                    device=device,
                )

            if len(audio_bytes) < 1000:
                print("(No audio captured — try again)")
                continue

            print("Transcribing...")
            transcript = transcribe_audio(
                audio_bytes,
                api_key=sarvam_key,
                model="saaras:v3",
                mode="codemix",
                language_code="hi-IN",
            )
            transcript = (transcript or "").strip()
            if not transcript:
                print("(Could not transcribe — try again)")
                continue

            print(f"  You: {transcript}")
            history.append({"role": "user", "content": transcript})

            print("Thinking...")
            reply = get_reply(
                transcript,
                api_key=google_key,
                history=history[:-1],
                model="gemini-3.1-flash-lite-preview",
            )
            reply = (reply or "").strip()
            if not reply:
                print("(No response from LLM)")
                continue

            print(f"  Bodhi: {reply}")
            history.append({"role": "assistant", "content": reply})

            print("Speaking...")
            speak(
                reply,
                api_key=sarvam_key,
                target_language_code="hi-IN",
                speaker="shubh",
                play=True,
            )
            print("Done.")

        except KeyboardInterrupt:
            print("\nBye.")
            break
        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    main()
