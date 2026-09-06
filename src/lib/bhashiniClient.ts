/**
 * BhashiniClient
 * ----------------
 * Thin wrapper around the Bhashini (ULCA / Dhruva) government translation APIs.
 *
 * Docs: https://bhashini.gitbook.io/bhashini-apis
 *
 * Flow:
 *  1. Pipeline Config call -> resolves which service/model IDs to use for a task
 *  2. Pipeline Compute call -> sends the actual input, gets output back
 *
 * IMPORTANT (demo-safety):
 * If BHASHINI_USER_ID / BHASHINI_API_KEY are not set in the environment, every
 * method below falls back to a clearly-labelled MOCK response instead of
 * throwing. This means the whole app is fully click-through-able for UI/demo
 * purposes even before real credentials are approved. Once credentials are
 * added to .env.local, real calls kick in automatically — no code changes
 * needed.
 */

const PIPELINE_CONFIG_ENDPOINT =
  "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline";
const INFERENCE_ENDPOINT =
  "https://dhruva-api.bhashini.gov.in/services/inference/pipeline";

// Publicly known default pipeline ID supporting ASR+NMT+TTS task chains.
// Swap this out once you confirm the exact pipeline ID for Santhali via the
// Bhashini model explorer (https://bhashini.gov.in/ulca/model/explore-models).
const DEFAULT_PIPELINE_ID =
  process.env.BHASHINI_PIPELINE_ID || "64392f96daac500b55c543cd";

export type LangCode = "hi" | "sat"; // Hindi, Santhali

interface TranslateResult {
  text: string;
  mocked: boolean;
}

interface AsrResult {
  text: string;
  mocked: boolean;
}

interface TtsResult {
  audioBase64: string | null;
  mocked: boolean;
}

function hasCredentials() {
  return Boolean(process.env.BHASHINI_USER_ID && process.env.BHASHINI_API_KEY);
}

function authHeaders() {
  return {
    userID: process.env.BHASHINI_USER_ID || "",
    ulcaApiKey: process.env.BHASHINI_API_KEY || "",
    "Content-Type": "application/json",
  };
}

/**
 * Very small mock dictionary so the demo UI has something believable to show
 * before real Santhali NMT credentials/models are wired in. NOT for
 * production use — purely a UI placeholder.
 */
const MOCK_HI_TO_SAT: Record<string, string> = {
  "नमस्ते": "जोहार",
  "आज हम अक्षर सीखेंगे": "टिया आबू ओनोल सेरेंज ",
  "यह एक सेब है": "नोवा मियाद आपेल कान",
  "गिनती करो एक से बीस तक": "मोन खोन बार आते लेखा मे",
};

export class BhashiniClient {
  async translate(
    text: string,
    sourceLang: LangCode,
    targetLang: LangCode
  ): Promise<TranslateResult> {
    if (!hasCredentials()) {
      const mock =
        sourceLang === "hi"
          ? MOCK_HI_TO_SAT[text.trim()] ||
            `[sat-mock] ${text}`
          : `[hi-mock] ${text}`;
      return { text: mock, mocked: true };
    }

    try {
      const configRes = await fetch(PIPELINE_CONFIG_ENDPOINT, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          pipelineTasks: [
            {
              taskType: "translation",
              config: {
                language: { sourceLanguage: sourceLang, targetLanguage: targetLang },
              },
            },
          ],
          pipelineRequestConfig: { pipelineId: DEFAULT_PIPELINE_ID },
        }),
      });
      const config = await configRes.json();

      const computeRes = await fetch(INFERENCE_ENDPOINT, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          pipelineTasks: [
            {
              taskType: "translation",
              config: {
                language: { sourceLanguage: sourceLang, targetLanguage: targetLang },
              },
            },
          ],
          inputData: { input: [{ source: text }] },
          pipelineResponseConfig: config?.pipelineResponseConfig,
        }),
      });
      const data = await computeRes.json();
      const output =
        data?.pipelineResponse?.[0]?.output?.[0]?.target || `[untranslated] ${text}`;
      return { text: output, mocked: false };
    } catch (err) {
      console.error("Bhashini translate() failed, falling back to mock:", err);
      return { text: `[error-fallback] ${text}`, mocked: true };
    }
  }

  async asr(audioBase64: string, sourceLang: LangCode): Promise<AsrResult> {
    if (!hasCredentials()) {
      return {
        text:
          sourceLang === "hi"
            ? "आज हम अक्षर सीखेंगे"
            : "टिया आबू ओनोल सेरेंज",
        mocked: true,
      };
    }

    try {
      const configRes = await fetch(PIPELINE_CONFIG_ENDPOINT, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          pipelineTasks: [
            { taskType: "asr", config: { language: { sourceLanguage: sourceLang } } },
          ],
          pipelineRequestConfig: { pipelineId: DEFAULT_PIPELINE_ID },
        }),
      });
      const config = await configRes.json();

      const computeRes = await fetch(INFERENCE_ENDPOINT, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          pipelineTasks: [
            { taskType: "asr", config: { language: { sourceLanguage: sourceLang } } },
          ],
          inputData: { audio: [{ audioContent: audioBase64 }] },
          pipelineResponseConfig: config?.pipelineResponseConfig,
        }),
      });
      const data = await computeRes.json();
      const output = data?.pipelineResponse?.[0]?.output?.[0]?.source || "";
      return { text: output, mocked: false };
    } catch (err) {
      console.error("Bhashini asr() failed, falling back to mock:", err);
      return { text: "[error-fallback: could not transcribe]", mocked: true };
    }
  }

  async tts(text: string, lang: LangCode): Promise<TtsResult> {
    if (!hasCredentials()) {
      return { audioBase64: null, mocked: true };
    }

    try {
      const configRes = await fetch(PIPELINE_CONFIG_ENDPOINT, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          pipelineTasks: [
            { taskType: "tts", config: { language: { sourceLanguage: lang } } },
          ],
          pipelineRequestConfig: { pipelineId: DEFAULT_PIPELINE_ID },
        }),
      });
      const config = await configRes.json();

      const computeRes = await fetch(INFERENCE_ENDPOINT, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          pipelineTasks: [
            { taskType: "tts", config: { language: { sourceLanguage: lang } } },
          ],
          inputData: { input: [{ source: text }] },
          pipelineResponseConfig: config?.pipelineResponseConfig,
        }),
      });
      const data = await computeRes.json();
      const audio = data?.pipelineResponse?.[0]?.audio?.[0]?.audioContent || null;
      return { audioBase64: audio, mocked: false };
    } catch (err) {
      console.error("Bhashini tts() failed, falling back to mock:", err);
      return { audioBase64: null, mocked: true };
    }
  }
}

export const bhashiniClient = new BhashiniClient();
