"""
Offline Vernacular Classroom Assistant - Phase 1-2 pipeline
=============================================================

Usage:
    python pipeline.py teacher.wav --lang hi
    python pipeline.py teacher.wav --lang en

This is the standalone Python pipeline described in the SIH brief, section 16:
    audio -> ASR -> source text -> phrase-memory check -> IndicTrans2 -> Santali text

Run this on a laptop first. Only after this reliably works offline should it be
wired into the Flutter/Android app (the services below map 1:1 onto the
ASRService / TranslationService interfaces in the app spec).
"""

import argparse
import json
import os
import time
from pathlib import Path

import torch
torch.set_num_threads(os.cpu_count())

# ----------------------------------------------------------------------------
# Language codes (FLORES-200 codes used by IndicTrans2)
# ----------------------------------------------------------------------------
LANG_CODES = {
    "hi": "hin_Deva",
    "en": "eng_Latn",
}
TARGET_LANG = "sat_Olck"

PHRASE_MEMORY_PATH = Path(__file__).parent / "verified_phrases.json"


# ----------------------------------------------------------------------------
# ASR Service (swap this class out later for IndicConformer / native Android)
# ----------------------------------------------------------------------------
class ASRService:
    def __init__(self, model_size: str = "small"):
        from faster_whisper import WhisperModel

        # "small" is the speed/accuracy sweet spot for CPU. "medium" is more
        # accurate but noticeably slower - only use it if latency isn't tight.
        self.model = WhisperModel(model_size, device="cpu", compute_type="int8", cpu_threads=os.cpu_count())

    def transcribe(self, audio_path: str, lang: str) -> str:
        segments, _ = self.model.transcribe(audio_path, language=lang, beam_size=1)
        return " ".join(seg.text.strip() for seg in segments).strip()


# ----------------------------------------------------------------------------
# Phrase Memory (section 8 hybrid pipeline: verified phrases win over MT)
# ----------------------------------------------------------------------------
class PhraseMemory:
    def __init__(self, path: Path = PHRASE_MEMORY_PATH):
        self.entries = []
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                self.entries = json.load(f)

    def lookup_entry(self, text: str, source_lang: str) -> dict | None:
        """Returns the full matching dictionary entry (santali text + audio_path), or None."""
        key = "hindi" if source_lang == "hi" else "english"
        norm = text.strip().rstrip("।.?! ")
        for entry in self.entries:
            candidate = entry.get(key, "").strip().rstrip("।.?! ")
            if candidate and candidate == norm and entry.get("verified") and entry.get("santali"):
                return entry
        return None

    def lookup(self, text: str, source_lang: str) -> str | None:
        """Backwards-compatible: returns just the Santali text, or None."""
        entry = self.lookup_entry(text, source_lang)
        return entry["santali"] if entry else None

    def save_correction(self, source_text: str, source_lang: str, corrected_santali: str, path: Path = PHRASE_MEMORY_PATH):
        """
        Human-in-the-loop correction (section 21 of the brief). Adds a new
        verified entry, or updates an existing unverified/wrong one, then
        writes it back to disk so it's remembered permanently.
        """
        key = "hindi" if source_lang == "hi" else "english"
        norm = source_text.strip().rstrip("।.?! ")

        for entry in self.entries:
            candidate = entry.get(key, "").strip().rstrip("।.?! ")
            if candidate == norm:
                entry["santali"] = corrected_santali
                entry["verified"] = True
                entry["source"] = "teacher_correction"
                break
        else:
            new_entry = {
                "hindi": source_text if source_lang == "hi" else "",
                "english": source_text if source_lang == "en" else "",
                "santali": corrected_santali,
                "romanization": "",
                "category": "Uncategorized",
                "audio_path": "",
                "verified": True,
                "source": "teacher_correction",
            }
            self.entries.append(new_entry)

        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.entries, f, ensure_ascii=False, indent=2)


# ----------------------------------------------------------------------------
# Translation Service (IndicTrans2)
# ----------------------------------------------------------------------------
class TranslationService:
    """
    Loads the correct IndicTrans2 checkpoint depending on source language:
      - English source  -> en-indic model
      - Hindi source     -> indic-indic model (Hindi is an Indic language)

    NOTE: checkpoint names occasionally change on AI4Bharat's HuggingFace org.
    Verify the exact repo id on huggingface.co/ai4bharat before first run.
    """

    EN_INDIC_MODEL = "ai4bharat/indictrans2-en-indic-dist-200M"
    INDIC_INDIC_MODEL = "ai4bharat/indictrans2-indic-indic-dist-320M"

    def __init__(self):
        self._models = {}  # lazy-loaded, keyed by model name

    def _load(self, model_name: str):
        if model_name not in self._models:
            from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
            from IndicTransToolkit.processor import IndicProcessor

            tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
            model = AutoModelForSeq2SeqLM.from_pretrained(model_name, trust_remote_code=True)
            processor = IndicProcessor(inference=True)
            self._models[model_name] = (tokenizer, model, processor)
        return self._models[model_name]

    def translate(self, text: str, source_lang: str) -> str:
        src_code = LANG_CODES[source_lang]
        model_name = self.EN_INDIC_MODEL if source_lang == "en" else self.INDIC_INDIC_MODEL
        tokenizer, model, processor = self._load(model_name)

        batch = processor.preprocess_batch([text], src_lang=src_code, tgt_lang=TARGET_LANG)
        inputs = tokenizer(batch, return_tensors="pt", padding=True, truncation=True)
        with __import__("torch").no_grad():
            generated = model.generate(**inputs, max_length=60, num_beams=1)
        decoded = tokenizer.batch_decode(generated, skip_special_tokens=True)
        result = processor.postprocess_batch(decoded, lang=TARGET_LANG)
        return result[0]


# ----------------------------------------------------------------------------
# TTS Service (section 6 of the brief: verified audio preferred over neural TTS)
# ----------------------------------------------------------------------------
class TTSService:
    """Base interface. The rest of the app should only ever talk to this."""

    def speak(self, santali_text: str, audio_path: str | None) -> bool:
        """Returns True if audio was actually played, False if nothing was available."""
        raise NotImplementedError

    def synthesize(self, santali_text: str, audio_path: str | None = None):
        """Returns (audio_array, sample_rate) without playing it out loud, or None
        if nothing was available. Used by UIs (e.g. Streamlit) that play audio
        in the browser rather than on the server's speakers."""
        raise NotImplementedError


class VerifiedAudioTTS(TTSService):
    """Plays a real pre-recorded .wav file for a known/verified phrase."""

    def speak(self, santali_text: str, audio_path: str | None) -> bool:
        if not audio_path:
            return False
        full_path = Path(__file__).parent / audio_path
        if not full_path.exists():
            return False

        import sounddevice as sd
        import soundfile as sf

        data, samplerate = sf.read(str(full_path))
        sd.play(data, samplerate)
        sd.wait()
        return True

    def synthesize(self, santali_text: str, audio_path: str | None = None):
        if not audio_path:
            return None
        full_path = Path(__file__).parent / audio_path
        if not full_path.exists():
            return None

        import soundfile as sf

        data, samplerate = sf.read(str(full_path))
        return data, samplerate


class NeuralTTS(TTSService):
    """
    Real Santali speech synthesis using AI4Bharat's Indic Parler-TTS
    (pretrained checkpoint), which has an officially supported Santali
    speaker ("Pushpa", female / "Arjun", male).

    Lazy-loaded: the ~3.75GB model only downloads/loads the first time
    speak() is actually called, not at startup.

    NOTE ON LATENCY: this is an autoregressive model generating audio
    token-by-token. On CPU (no CUDA) it is inherently slow — often 10-30+
    seconds per sentence, no matter how it's tuned. The MAX_NEW_TOKENS cap
    below prevents runaway generation on long input, and the speaker
    description is pre-tokenized once instead of on every call, but the
    real fix for live-classroom latency is to keep verified_phrases.json
    well-stocked with pre-recorded audio (VerifiedAudioTTS) so common
    phrases skip this class entirely.
    """

    MODEL_NAME = "ai4bharat/indic-parler-tts-pretrained"
    SPEAKER_DESCRIPTION = (
        "Pushpa speaks in a clear, warm, moderate-paced voice, in a quiet, "
        "very high quality, close-up recording with no background noise."
    )
    # Roughly caps generated audio to ~12s, enough for a classroom sentence.
    # Prevents the model from running away on unexpectedly long input.
    MAX_NEW_TOKENS = 1000

    def __init__(self):
        self._model = None
        self._tokenizer = None
        self._description_tokenizer = None
        self._description_ids = None  # cached, since SPEAKER_DESCRIPTION never changes

    def _load(self):
        if self._model is None:
            import torch
            from parler_tts import ParlerTTSForConditionalGeneration
            from transformers import AutoTokenizer

            self._device = "cuda:0" if torch.cuda.is_available() else "cpu"
            self._model = ParlerTTSForConditionalGeneration.from_pretrained(
                self.MODEL_NAME, low_cpu_mem_usage=True
            ).to(self._device)
            self._model.eval()
            self._tokenizer = AutoTokenizer.from_pretrained(self.MODEL_NAME)
            self._description_tokenizer = AutoTokenizer.from_pretrained(
                self._model.config.text_encoder._name_or_path
            )
            # Tokenize the (fixed) speaker description once instead of every call.
            self._description_ids = self._description_tokenizer(
                self.SPEAKER_DESCRIPTION, return_tensors="pt"
            ).input_ids.to(self._device)

    def _generate(self, santali_text: str):
        import torch

        prompt_ids = self._tokenizer(santali_text, return_tensors="pt").input_ids.to(self._device)
        with torch.inference_mode():
            generation = self._model.generate(
                input_ids=self._description_ids,
                prompt_input_ids=prompt_ids,
                max_new_tokens=self.MAX_NEW_TOKENS,
            )
        return generation.cpu().numpy().squeeze()

    def speak(self, santali_text: str, audio_path: str | None) -> bool:
        if not santali_text:
            return False

        self._load()
        import sounddevice as sd

        audio_arr = self._generate(santali_text)
        sd.play(audio_arr, self._model.config.sampling_rate)
        sd.wait()
        return True

    def synthesize(self, santali_text: str, audio_path: str | None = None):
        if not santali_text:
            return None

        self._load()
        audio_arr = self._generate(santali_text)
        return audio_arr, self._model.config.sampling_rate


class HybridTTS(TTSService):
    """Tries verified audio first, falls back to neural TTS if that ever exists."""

    def __init__(self):
        self.verified = VerifiedAudioTTS()
        self.neural = NeuralTTS()

    def speak(self, santali_text: str, audio_path: str | None) -> bool:
        if self.verified.speak(santali_text, audio_path):
            return True
        return self.neural.speak(santali_text, audio_path)

    def synthesize(self, santali_text: str, audio_path: str | None = None):
        """Returns (audio_array, sample_rate, source_label) or None."""
        result = self.verified.synthesize(santali_text, audio_path)
        if result is not None:
            return result[0], result[1], "verified_audio"

        result = self.neural.synthesize(santali_text, audio_path)
        if result is not None:
            return result[0], result[1], "neural_tts"

        return None


# ----------------------------------------------------------------------------
# Main pipeline
# ----------------------------------------------------------------------------
def run_pipeline(audio_path: str, source_lang: str):
    timings = {}
    t0 = time.time()

    asr = ASRService()
    t1 = time.time()
    timings["asr_model_load_sec"] = round(t1 - t0, 2)

    source_text = asr.transcribe(audio_path, lang=source_lang)
    t2 = time.time()
    timings["asr_inference_sec"] = round(t2 - t1, 2)

    memory = PhraseMemory()
    verified = memory.lookup(source_text, source_lang)

    if verified:
        santali_text = verified
        source_used = "verified_phrase_memory"
        t3 = time.time()
    else:
        translator = TranslationService()
        santali_text = translator.translate(source_text, source_lang)
        source_used = "indictrans2"
        t3 = time.time()
    timings["translation_sec"] = round(t3 - t2, 2)
    timings["total_sec"] = round(t3 - t0, 2)

    print("\n--- Pipeline Result ---")
    print(f"Source language : {source_lang} ({LANG_CODES[source_lang]})")
    print(f"Recognized text : {source_text}")
    print(f"Santali (Olck)  : {santali_text}")
    print(f"Translation src : {source_used}")
    print("\n--- Latency (sec) ---")
    for k, v in timings.items():
        print(f"{k:25s} {v}")

    target_met = timings["total_sec"] <= 3.0
    print(f"\n≤3s target (excl. model load): "
          f"{'MET' if (timings['asr_inference_sec'] + timings['translation_sec']) <= 3.0 else 'NOT MET'}")

    return {
        "source_text": source_text,
        "santali_text": santali_text,
        "source_used": source_used,
        "timings": timings,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Offline speech -> Santali pipeline")
    parser.add_argument("audio_path", help="Path to input .wav file")
    parser.add_argument("--lang", choices=["hi", "en"], default="hi",
                         help="Source language of the audio (hi=Hindi, en=English)")
    args = parser.parse_args()

    run_pipeline(args.audio_path, args.lang)