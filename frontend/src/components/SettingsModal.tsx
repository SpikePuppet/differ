import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";

interface Props {
  onClose: () => void;
}

const PROVIDERS = [
  { value: "anthropic", label: "Anthropic" },
  { value: "openai", label: "OpenAI" },
  { value: "openrouter", label: "OpenRouter" },
];

const ANTHROPIC_MODELS = [
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { value: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
];

const OPENAI_MODELS = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "o3-mini", label: "o3-mini" },
];

const PROVIDER_DEFAULTS = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o",
  openrouter: "",
} as const;

export function SettingsModal({ onClose }: Props) {
  const [provider, setProvider] = useState(PROVIDERS[0]!.value);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [models, setModels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [savedProvider, ...settings] = await Promise.all([
        api.settings.get("ai_provider"),
        api.settings.get("anthropic_api_key"),
        api.settings.get("anthropic_model"),
        api.settings.get("openai_api_key"),
        api.settings.get("openai_model"),
        api.settings.get("openrouter_api_key"),
        api.settings.get("openrouter_model"),
      ]);

      const activeProvider = savedProvider ?? PROVIDERS[0]!.value;
      setProvider(activeProvider);

      setKeys({
        anthropic: settings[0] ?? "",
        openai: settings[2] ?? "",
        openrouter: settings[4] ?? "",
      });

      const anthropicModel = settings[1] ?? null;
      const openaiModel = settings[3] ?? null;
      const openrouterModel = settings[5] ?? null;

      setModels({
        anthropic: anthropicModel ?? PROVIDER_DEFAULTS.anthropic,
        openai: openaiModel ?? PROVIDER_DEFAULTS.openai,
        openrouter: openrouterModel ?? PROVIDER_DEFAULTS.openrouter,
      });
    } catch {
      setProvider(PROVIDERS[0]!.value);
      setKeys({});
      setModels({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    setTimeout(() => inputRef.current?.focus(), 120);
  }, [load]);

  async function save() {
    try {
      await api.settings.set("ai_provider", provider);
      await api.settings.set(`${provider}_api_key`, (keys[provider] ?? "").trim());
      await api.settings.set(`${provider}_model`, models[provider] ?? "");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert("Could not save settings.");
    }
  }

  const providerLabel = PROVIDERS.find((p) => p.value === provider)?.label ?? provider;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" style={{ maxWidth: 520 }}>
        <header className="modal-head">
          <div className="modal-pressmark" aria-hidden="true">
            <svg width="28" height="16" viewBox="0 0 32 18" fill="none">
              <path
                d="M16 9 C 10 4, 2 5, 1 9 C 2 13, 10 14, 16 9 Z"
                stroke="currentColor"
                strokeWidth="1"
                fill="currentColor"
                fillOpacity="0.15"
              />
              <path
                d="M16 9 C 22 4, 30 5, 31 9 C 30 13, 22 14, 16 9 Z"
                stroke="currentColor"
                strokeWidth="1"
                fill="currentColor"
                fillOpacity="0.15"
              />
              <circle cx="16" cy="9" r="1.4" fill="currentColor" />
            </svg>
          </div>
          <div>
            <span className="smallcaps" style={{ color: "var(--ink-faint)" }}>
              Press Room
            </span>
            <h3>
              The <em>compositor&apos;s</em> preferences
            </h3>
            <p className="head-sub">Configure the tools of the trade.</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4 L 12 12 M 12 4 L 4 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div style={{ padding: "28px 36px" }}>
          <div className="form-row">
            <label htmlFor="ai-provider">Provider</label>
            <div className="select-wrap">
              <select
                id="ai-provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                disabled={loading}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              <svg className="select-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 6 L8 10 L12 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          <div className="form-row">
            <label htmlFor="api-key">{providerLabel} API Key</label>
            <input
              ref={inputRef}
              id="api-key"
              type="password"
              value={keys[provider] ?? ""}
              onChange={(e) =>
                setKeys((prev) => ({ ...prev, [provider]: e.target.value }))
              }
              placeholder={
                provider === "anthropic"
                  ? "sk-ant-api03-..."
                  : provider === "openai"
                    ? "sk-..."
                    : "sk-or-v1-..."
              }
              autoComplete="off"
              spellCheck={false}
              disabled={loading}
            />
            <span className="hint">Stored locally in plain text.</span>
          </div>

          <div className="form-row">
            <label htmlFor="ai-model">Model</label>
            {provider === "openrouter" ? (
              <input
                id="ai-model"
                type="text"
                value={models[provider] ?? ""}
                onChange={(e) =>
                  setModels((prev) => ({ ...prev, [provider]: e.target.value }))
                }
                placeholder="anthropic/claude-sonnet-4"
                autoComplete="off"
                spellCheck={false}
                disabled={loading}
              />
            ) : (
              <div className="select-wrap">
                <select
                  id="ai-model"
                  value={models[provider] ?? ""}
                  onChange={(e) =>
                    setModels((prev) => ({ ...prev, [provider]: e.target.value }))
                  }
                  disabled={loading}
                >
                  {(provider === "openai" ? OPENAI_MODELS : ANTHROPIC_MODELS).map(
                    (m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    )
                  )}
                </select>
                <svg className="select-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M4 6 L8 10 L12 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </div>

          {saved && (
            <div
              style={{
                fontFamily: "Newsreader, serif",
                fontStyle: "italic",
                fontSize: "0.92rem",
                color: "var(--olive)",
                marginTop: 12,
              }}
            >
              Saved.
            </div>
          )}
        </div>

        <footer className="modal-foot">
          <span className="kbd-hint">
            <kbd>⌘</kbd> + <kbd>,</kbd> to reopen
          </span>
          <div className="foot-actions">
            <button className="btn" onClick={onClose}>
              Close
            </button>
            <button className="btn primary" onClick={save} disabled={loading}>
              Save
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
