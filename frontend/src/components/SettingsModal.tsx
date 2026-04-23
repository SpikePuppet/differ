import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";

interface Props {
  onClose: () => void;
}

const MODELS = [
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { value: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
];

export function SettingsModal({ onClose }: Props) {
  const [keyValue, setKeyValue] = useState("");
  const [model, setModel] = useState(MODELS[0]!.value);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [existingKey, existingModel] = await Promise.all([
        api.settings.get("anthropic_api_key"),
        api.settings.get("anthropic_model"),
      ]);
      setKeyValue(existingKey ?? "");
      if (existingModel && MODELS.some((m) => m.value === existingModel)) {
        setModel(existingModel);
      }
    } catch {
      setKeyValue("");
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
      await api.settings.set("anthropic_api_key", keyValue.trim());
      await api.settings.set("anthropic_model", model);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert("Could not save settings.");
    }
  }

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
            <label htmlFor="anthropic-key">Anthropic API Key</label>
            <input
              ref={inputRef}
              id="anthropic-key"
              type="password"
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              placeholder="sk-ant-api03-..."
              autoComplete="off"
              spellCheck={false}
              disabled={loading}
            />
            <span className="hint">Stored locally in plain text.</span>
          </div>

          <div className="form-row">
            <label htmlFor="anthropic-model">Model</label>
            <select
              id="anthropic-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={loading}
            >
              {MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
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
