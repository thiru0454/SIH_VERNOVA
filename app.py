"""
Streamlit demo UI for the Offline Vernacular Classroom Assistant pipeline.
============================================================================
Wraps the existing pipeline.py (ASRService, PhraseMemory, TranslationService,
HybridTTS) — full voice-to-voice: mic in, Santali text AND spoken audio out.

Usage:
    streamlit run app.py

Upload a .wav file OR record from the mic (browser permission required),
pick the source language, and see the Santali translation with latency
and source (verified phrase memory vs IndicTrans2) info. If a translation
is wrong, correct it inline and it's saved to verified_phrases.json for
next time.
"""

import io
import tempfile
import time

import soundfile as sf
import streamlit as st

from pipeline import ASRService, PhraseMemory, TranslationService, HybridTTS, LANG_CODES

st.set_page_config(page_title="Vernacular Classroom Assistant", page_icon="🗣️", layout="centered")


@st.cache_resource(show_spinner="Loading ASR model (first run only)...")
def load_asr():
    return ASRService()


@st.cache_resource(show_spinner="Loading translation model (first run only)...")
def load_translator():
    return TranslationService()


@st.cache_resource(show_spinner="Loading voice model (first run only — downloads ~3.75GB)...")
def load_tts():
    return HybridTTS()


def load_memory():
    # Re-read from disk each time so corrections saved this session show up.
    return PhraseMemory()


st.title("🗣️ Offline Vernacular Classroom Assistant")
st.caption("Speech (Hindi/English) → Santali (Ol Chiki) — voice in, voice out")

lang_label = st.sidebar.radio("Source language", ["Hindi", "English"])
lang = "hi" if lang_label == "Hindi" else "en"

st.sidebar.divider()
enable_voice = st.sidebar.checkbox("🔊 Speak the Santali translation", value=True)
st.sidebar.caption(
    "First use downloads the ~3.75GB neural voice model (Indic Parler-TTS). "
    "Verified phrases with a saved audio clip play instantly with no download."
)

input_mode = st.radio("Audio input", ["Record from mic", "Upload a .wav file"], horizontal=True)

audio_bytes = None
if input_mode == "Record from mic":
    recorded = st.audio_input("Press record, speak, then stop")
    if recorded is not None:
        audio_bytes = recorded.read()
else:
    uploaded = st.file_uploader("Upload a .wav file", type=["wav"])
    if uploaded is not None:
        audio_bytes = uploaded.read()

if audio_bytes:
    st.audio(audio_bytes)
    preview = st.empty()

    if st.button("Translate", type="primary"):
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        asr = load_asr()
        translator = load_translator()
        memory = load_memory()

        t0 = time.time()
        with st.spinner("Transcribing..."):
            source_text = asr.transcribe(tmp_path, lang=lang)
        t1 = time.time()

        entry = memory.lookup_entry(source_text, lang)
        if entry:
            santali_text = entry["santali"]
            src_used = "Verified phrase memory"
        else:
            with st.spinner("Translating..."):
                santali_text = translator.translate(source_text, lang)
            src_used = "IndicTrans2 (machine translation)"
        t2 = time.time()

        # Show the text result right away — don't make the reader stare at a
        # blank screen while the (much slower) voice model runs below. This
        # gets cleared and replaced by the full result block once voice is done.
        with preview.container():
            st.subheader("Result")
            col1, col2 = st.columns(2)
            with col1:
                st.markdown(f"**Recognized ({lang.upper()})**")
                st.write(source_text or "_(empty)_")
            with col2:
                st.markdown("**Santali (Ol Chiki)**")
                st.write(santali_text or "_(empty)_")
            st.caption(f"Source: {src_used}")
            if enable_voice:
                st.caption("🔊 Generating voice — this is the slow part on CPU, hang tight...")

        audio_wav_bytes = None
        tts_source = None
        tts_sec = None
        if enable_voice:
            tts = load_tts()
            with st.spinner("Synthesizing voice..."):
                tts_result = tts.synthesize(santali_text, entry.get("audio_path") if entry else None)
            t3 = time.time()
            tts_sec = round(t3 - t2, 2)
            if tts_result is not None:
                audio_arr, sample_rate, tts_source = tts_result
                buf = io.BytesIO()
                sf.write(buf, audio_arr, sample_rate, format="WAV")
                audio_wav_bytes = buf.getvalue()

        # Keep the result around so the correction box below survives reruns.
        st.session_state["result"] = {
            "source_text": source_text,
            "santali_text": santali_text,
            "src_used": src_used,
            "lang": lang,
            "asr_sec": round(t1 - t0, 2),
            "mt_sec": round(t2 - t1, 2),
            "total_sec": round(t2 - t0, 2),
            "audio_wav_bytes": audio_wav_bytes,
            "tts_source": tts_source,
            "tts_sec": tts_sec,
        }
        preview.empty()

if "result" in st.session_state:
    r = st.session_state["result"]

    st.subheader("Result")
    col1, col2 = st.columns(2)
    with col1:
        st.markdown(f"**Recognized ({r['lang'].upper()})**")
        st.write(r["source_text"] or "_(empty)_")
    with col2:
        st.markdown("**Santali (Ol Chiki)**")
        st.write(r["santali_text"] or "_(empty)_")

    st.caption(f"Source: {r['src_used']}")

    if r.get("audio_wav_bytes"):
        label = "Verified audio clip" if r["tts_source"] == "verified_audio" else "Neural TTS (Parler-TTS)"
        st.markdown(f"**🔊 Santali audio** — _{label}_")
        st.audio(r["audio_wav_bytes"], format="audio/wav")
    elif r.get("tts_sec") is not None:
        st.info("Voice output was on, but no audio could be generated for this text.")

    cols = st.columns(4) if r.get("tts_sec") is not None else st.columns(3)
    cols[0].metric("ASR latency", f"{r['asr_sec']}s")
    cols[1].metric("Translation latency", f"{r['mt_sec']}s")
    if r.get("tts_sec") is not None:
        cols[2].metric("Voice latency", f"{r['tts_sec']}s")
        cols[3].metric("Total", f"{r['total_sec'] + r['tts_sec']:.2f}s")
    else:
        cols[2].metric("Total", f"{r['total_sec']}s", delta="≤3s target" if r["total_sec"] <= 3 else "over target")

    with st.expander("Wrong translation? Correct it"):
        correction = st.text_area("Correct Santali (Ol Chiki) text", key="correction_box")
        if st.button("Save correction"):
            if correction.strip():
                memory = load_memory()
                memory.save_correction(r["source_text"], r["lang"], correction.strip())
                st.success("Saved to verified_phrases.json — it will be used next time this phrase comes up.")
            else:
                st.warning("Type the corrected Santali text before saving.")