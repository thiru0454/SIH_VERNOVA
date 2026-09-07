# Running fully offline

The pipeline itself (ASR + IndicTrans2) never needs the internet at
*runtime* — but the model weights are **not** included in `pip install`.
They're downloaded from Hugging Face the first time each model is loaded,
then cached locally (usually under `C:\Users\<you>\.cache\huggingface`).

So the workflow is: **cache once while online, then lock out the network.**

## 1. One-time download (needs internet)

```powershell
python scripts/download_models.py
```

This pulls down:
- the `faster-whisper` "small" ASR model
- the IndicTrans2 en→indic checkpoint (used for English source)
- the IndicTrans2 indic→indic checkpoint (used for Hindi source)

Let it finish completely — don't Ctrl+C partway through, or you'll end up
with a partially-cached model that fails later.

## 2. Verify it's cached

Run the download script again with your Wi-Fi turned off. If it prints
"Done." for all three without errors, you're cached and ready.

## 3. Run offline from now on

```powershell
.\run_offline.ps1
```

This sets `HF_HUB_OFFLINE=1` and `TRANSFORMERS_OFFLINE=1` before starting
Streamlit, so if anything is missing from the cache, it fails immediately
with a clear error instead of hanging while it tries to reach the internet.

If you just run `streamlit run app.py` directly (without the offline
script), it'll still work as long as everything's cached — the env vars
just add a safety net so you know for sure nothing's silently trying to
phone home.

## Notes
- Voice (TTS) is a separate model and isn't part of this offline setup yet —
  that comes later, per the earlier plan.
- If you ever see a `ConnectionError` or a long hang after turning
  `HF_HUB_OFFLINE` on, it means a model wasn't fully cached — rerun step 1
  with internet back on.