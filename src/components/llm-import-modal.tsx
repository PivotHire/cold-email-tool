"use client";

import { useState } from "react";

interface ParsedContact {
  name: string;
  email: string;
  company: string;
  title: string | null;
  industry: string | null;
  segment: "STARTUP" | "TRADITIONAL";
}

interface LlmImportModalProps {
  onClose: () => void;
  onImported: () => void;
}

export function LlmImportModal({ onClose, onImported }: LlmImportModalProps) {
  const [step, setStep] = useState<"input" | "review">("input");
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<ParsedContact[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveErrors, setSaveErrors] = useState<string[]>([]);
  const [enriching, setEnriching] = useState(false);

  async function handleParse() {
    setParsing(true);
    setParseError(null);
    try {
      const res = await fetch("/api/contacts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setParseError(data.error ?? "Failed to parse contacts");
        return;
      }
      const parsed: ParsedContact[] = data.contacts ?? [];
      setContacts(parsed);
      setSelected(new Set(parsed.filter((c) => c.email?.trim()).map((_, i) => i)));
      setStep("review");
    } catch {
      setParseError("An unexpected error occurred. Please try again.");
    } finally {
      setParsing(false);
    }
  }

  const hasEmail = (c: ParsedContact) => !!c.email?.trim();
  const importable = contacts.filter(hasEmail);
  const missingEmailCount = contacts.filter((c) => !hasEmail(c)).length;

  function toggleContact(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === importable.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(contacts.map((_, i) => i).filter((i) => hasEmail(contacts[i]))));
    }
  }

  async function handleEnrich() {
    setEnriching(true);
    try {
      const noEmailContacts = contacts.filter((c) => !hasEmail(c));
      const res = await fetch("/api/contacts/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts: noEmailContacts }),
      });
      if (res.ok) {
        const data = await res.json();
        const enriched: ParsedContact[] = data.contacts ?? [];
        const found = enriched.filter((c) => hasEmail(c));
        const updated = [...contacts.filter((c) => hasEmail(c)), ...found];
        setContacts(updated);
        setSelected(new Set(updated.map((_, i) => i)));
      }
    } catch {
      // silently fail
    }
    setEnriching(false);
  }

  async function handleImport() {
    setSaving(true);
    setSaveErrors([]);
    const errors: string[] = [];

    for (const index of selected) {
      const contact = contacts[index];
      try {
        const res = await fetch("/api/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...contact, source: "manual" }),
        });
        if (!res.ok) {
          const data = await res.json();
          if (res.status === 409) {
            errors.push(`${contact.email}: already exists`);
          } else {
            errors.push(`${contact.email}: ${data.error ?? "Failed to save"}`);
          }
        }
      } catch {
        errors.push(`${contact.email}: network error`);
      }
    }

    setSaving(false);
    onImported();

    if (errors.length > 0) {
      setSaveErrors(errors);
    } else {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-900">
          {step === "input" ? "Import Contacts with AI" : "Review Parsed Contacts"}
        </h2>

        {step === "input" && (
          <>
            <p className="text-sm text-gray-500">
              Paste any unstructured text containing contact information. The AI will extract names,
              emails, companies, and more.
            </p>
            <textarea
              className="w-full h-48 border border-gray-300 rounded-md p-3 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Paste emails, LinkedIn profiles, contact lists, or any text with contact info..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            {parseError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md p-3">
                {parseError}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleParse}
                disabled={!text.trim() || parsing}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {parsing ? "Parsing..." : "Parse with AI"}
              </button>
            </div>
          </>
        )}

        {step === "review" && (
          <>
            {contacts.length === 0 ? (
              <p className="text-sm text-gray-500">No contacts were found in the provided text.</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    {importable.length} contact{importable.length !== 1 ? "s" : ""} ready to import.
                    {missingEmailCount > 0 && (
                      <span className="text-amber-600">
                        {" "}{missingEmailCount} skipped (no email).
                      </span>
                    )}
                  </p>
                  {missingEmailCount > 0 && (
                    <button
                      onClick={handleEnrich}
                      disabled={enriching}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50"
                    >
                      {enriching ? "Searching the web..." : `Search ${missingEmailCount} Missing Emails`}
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto border border-gray-200 rounded-md">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                      <tr>
                        <th className="px-3 py-2 w-8">
                          <input
                            type="checkbox"
                            checked={selected.size === importable.length && importable.length > 0}
                            onChange={toggleAll}
                            className="rounded"
                          />
                        </th>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Company</th>
                        <th className="px-3 py-2">Segment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {contacts.filter(hasEmail).map((contact, i) => (
                        <tr
                          key={i}
                          className={selected.has(contacts.indexOf(contact)) ? "bg-white" : "bg-gray-50 opacity-50"}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selected.has(contacts.indexOf(contact))}
                              onChange={() => toggleContact(contacts.indexOf(contact))}
                              className="rounded"
                            />
                          </td>
                          <td className="px-3 py-2 font-medium text-gray-900">{contact.name}</td>
                          <td className="px-3 py-2 text-gray-600">{contact.email}</td>
                          <td className="px-3 py-2 text-gray-600">{contact.company}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                contact.segment === "STARTUP"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {contact.segment}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {saveErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md p-3">
                <p className="font-medium mb-1">Some contacts could not be imported:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {saveErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-between gap-2">
              <button
                onClick={() => {
                  setStep("input");
                  setSaveErrors([]);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Back
              </button>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={selected.size === 0 || saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Importing..." : `Import ${selected.size} Contact${selected.size !== 1 ? "s" : ""}`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
