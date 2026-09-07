"""
Run this ONCE while you have internet, to pull down and cache every model
the pipeline needs. After this finishes successfully, you can run the app
fully offline (see OFFLINE.md).

Usage:
    python download_models.py
"""

from pipeline import ASRService, TranslationService, NeuralTTS, LANG_CODES  # noqa: F401


def main():
    print("=" * 60)
    print("Downloading and caching all models. This needs a real")
    print("internet connection and may take a while (several GB total).")
    print("=" * 60)

    print("\n[1/4] Downloading ASR model (faster-whisper 'small')...")
    ASRService()
    print("      Done.")

    print("\n[2/4] Downloading IndicTrans2 en->indic model (Hindi/English source)...")
    translator = TranslationService()
    translator._load(TranslationService.EN_INDIC_MODEL)
    print("      Done.")

    print("\n[3/4] Downloading IndicTrans2 indic->indic model (for Hindi source)...")
    translator._load(TranslationService.INDIC_INDIC_MODEL)
    print("      Done.")

    print("\n[4/4] Downloading neural voice model (Indic Parler-TTS, ~3.75GB)...")
    tts = NeuralTTS()
    tts._load()
    print("      Done.")

    print("\nAll models cached successfully.")
    print("You can now run the app fully offline — see OFFLINE.md.")


if __name__ == "__main__":
    main()