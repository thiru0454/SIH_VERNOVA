# Run the app fully offline: this stops transformers/faster-whisper/huggingface_hub
# from ever attempting a network call. If a model isn't cached yet, it will fail
# fast with a clear error instead of hanging while it tries to reach the internet.
#
# Usage (from inside the activated venv, in the project root):
#     .\run_offline.ps1

$env:HF_HUB_OFFLINE = "1"
$env:TRANSFORMERS_OFFLINE = "1"

streamlit run app.py