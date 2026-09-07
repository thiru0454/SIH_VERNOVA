"""
Live (push-to-talk) real-time pipeline.
================================================
No manual recording apps, no file conversion. Straight mic -> ASR -> Santali.

Usage:
    python live_pipeline.py

You'll be asked once whether you're speaking Hindi or English for this session,
then you just press ENTER, speak, press ENTER again, and see the Santali
translation appear within a couple of seconds.
"""

import tempfile
import time

import numpy as np
import sounddevice as sd
import soundfile as sf

from pipeline import ASRService, PhraseMemory, TranslationService, HybridTTS, LANG_CODES

SAMPLE_RATE = 16000


def record_until_enter():
    print("\nPress ENTER to START recording...")
    input()
    print("Recording... speak now. Press ENTER again to STOP.")

    recording = []

    def callback(indata, frames, time_info, status):
        recording.append(indata.copy())

    stream = sd.InputStream(samplerate=SAMPLE_RATE, channels=1, dtype="float32", callback=callback)
    with stream:
        input()  # blocks here until the user presses ENTER again

    if not recording:
        return None
    audio = np.concatenate(recording, axis=0)
    return audio


def main():
    print("Loading models — this happens only once, please wait...")
    asr = ASRService()
    translator = TranslationService()
    memory = PhraseMemory()
    tts = HybridTTS()
    print("Models loaded.\n")

    lang = ""
    while lang not in LANG_CODES:
        lang = input("Source language for this session (hi = Hindi, en = English): ").strip().lower()

    print(f"\nReady. Speaking in: {lang.upper()}")
    print("=" * 50)

    while True:
        audio = record_until_enter()
        if audio is None or len(audio) == 0:
            print("No audio captured, try again.")
            continue

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            sf.write(tmp.name, audio, SAMPLE_RATE)
            tmp_path = tmp.name

        t0 = time.time()
        source_text = asr.transcribe(tmp_path, lang=lang)
        t1 = time.time()

        entry = memory.lookup_entry(source_text, lang)
        if entry:
            santali_text = entry["santali"]
            audio_path = entry.get("audio_path")
            src_used = "verified phrase memory"
        else:
            santali_text = translator.translate(source_text, lang)
            audio_path = None
            src_used = "IndicTrans2 (machine translation)"
        t2 = time.time()

        played = tts.speak(santali_text, audio_path)

        print(f"\nRecognized ({lang.upper()}) : {source_text}")
        print(f"Santali (Ol Chiki)      : {santali_text}")
        print(f"Source                  : {src_used}")
        print(f"Audio                   : {'played' if played else 'not available for this phrase yet'}")
        print(f"Latency                 : ASR {t1-t0:.2f}s | Translation {t2-t1:.2f}s | Total {t2-t0:.2f}s")
        print("=" * 50)

        again = input("\nPress ENTER to translate again, or type q to quit: ").strip().lower()
        if again == "q":
            break


if __name__ == "__main__":
    main()