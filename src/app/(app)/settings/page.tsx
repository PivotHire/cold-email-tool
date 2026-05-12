"use client";

import { useEffect, useState } from "react";

interface SettingsState {
  name: string;
  title: string;
  email: string;
  signature: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
}

const INITIAL_STATE: SettingsState = {
  name: "",
  title: "",
  email: "",
  signature: "",
  smtpHost: "",
  smtpPort: "",
  smtpUser: "",
  smtpPass: "",
};

export default function SettingsPage() {
  const [state, setState] = useState<SettingsState>(INITIAL_STATE);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setState({
          name: data.name ?? "",
          title: data.title ?? "",
          email: data.email ?? "",
          signature: data.signature ?? "",
          smtpHost: data.smtpHost ?? "",
          smtpPort: data.smtpPort != null ? String(data.smtpPort) : "",
          smtpUser: data.smtpUser ?? "",
          smtpPass: data.smtpPass ?? "",
        });
      });
  }, []);

  function handleChange(field: keyof SettingsState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setState((prev) => ({ ...prev, [field]: e.target.value }));
    };
  }

  async function handleSave() {
    setSaveStatus("saving");
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: state.name,
        title: state.title,
        signature: state.signature,
        smtpHost: state.smtpHost || null,
        smtpPort: state.smtpPort ? Number(state.smtpPort) : null,
        smtpUser: state.smtpUser || null,
        smtpPass: state.smtpPass || null,
      }),
    });
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  }

  const inputClass =
    "block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  const sectionHeaderClass =
    "text-sm font-medium text-gray-500 uppercase tracking-wide mb-4";

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Settings</h1>

      {/* Profile Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className={sectionHeaderClass}>Profile</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>Name</label>
            <input
              type="text"
              value={state.name}
              onChange={handleChange("name")}
              className={inputClass}
              placeholder="Your name"
            />
          </div>
          <div>
            <label className={labelClass}>Title</label>
            <input
              type="text"
              value={state.title}
              onChange={handleChange("title")}
              className={inputClass}
              placeholder="Your title"
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Signature Template</label>
          <textarea
            value={state.signature}
            onChange={handleChange("signature")}
            rows={5}
            className={inputClass}
            placeholder="Your email signature..."
          />
          <p className="mt-1 text-xs text-gray-400">
            Variables: {"{name}"}, {"{title}"}, {"{email}"}
          </p>
        </div>
      </div>

      {/* SMTP Configuration Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className={sectionHeaderClass}>SMTP Configuration</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Host</label>
            <input
              type="text"
              value={state.smtpHost}
              onChange={handleChange("smtpHost")}
              className={inputClass}
              placeholder="smtp.example.com"
            />
          </div>
          <div>
            <label className={labelClass}>Port</label>
            <input
              type="text"
              value={state.smtpPort}
              onChange={handleChange("smtpPort")}
              className={inputClass}
              placeholder="587"
            />
          </div>
          <div>
            <label className={labelClass}>Username</label>
            <input
              type="text"
              value={state.smtpUser}
              onChange={handleChange("smtpUser")}
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className={labelClass}>Password</label>
            <input
              type="password"
              value={state.smtpPass}
              onChange={handleChange("smtpPass")}
              className={inputClass}
              placeholder="••••••••"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saveStatus === "saving"}
          className="px-5 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {saveStatus === "saving"
            ? "Saving..."
            : saveStatus === "saved"
            ? "Saved!"
            : "Save"}
        </button>
      </div>
    </div>
  );
}
