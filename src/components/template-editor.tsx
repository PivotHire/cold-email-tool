"use client";

import { useState } from "react";

interface Template {
  id: string;
  name: string;
  type: "BASE" | "SEGMENT" | "INDUSTRY";
  segment?: string | null;
  industry?: string | null;
  content: string;
}

interface TemplateEditorProps {
  templates: Template[];
  onRefresh: () => void;
}

interface NewTemplateForm {
  name: string;
  type: "SEGMENT" | "INDUSTRY";
  segment: string;
  industry: string;
  content: string;
}

const SECTION_ORDER: Array<"BASE" | "SEGMENT" | "INDUSTRY"> = [
  "BASE",
  "SEGMENT",
  "INDUSTRY",
];

const SECTION_LABELS: Record<string, string> = {
  BASE: "Base Template",
  SEGMENT: "Segment Templates",
  INDUSTRY: "Industry Templates",
};

export function TemplateEditor({ templates, onRefresh }: TemplateEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState<NewTemplateForm>({
    name: "",
    type: "SEGMENT",
    segment: "",
    industry: "",
    content: "",
  });
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  function startEdit(template: Template) {
    setEditingId(template.id);
    setEditContent(template.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditContent("");
  }

  async function saveEdit(id: string) {
    setSaving(true);
    await fetch(`/api/templates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent }),
    });
    setSaving(false);
    setEditingId(null);
    setEditContent("");
    onRefresh();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    onRefresh();
  }

  async function handleCreate() {
    setCreating(true);
    await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newForm.name,
        type: newForm.type,
        segment: newForm.segment || null,
        industry: newForm.industry || null,
        content: newForm.content,
      }),
    });
    setCreating(false);
    setShowNewForm(false);
    setNewForm({ name: "", type: "SEGMENT", segment: "", industry: "", content: "" });
    onRefresh();
  }

  return (
    <div className="space-y-8">
      {SECTION_ORDER.map((sectionType) => {
        const sectionTemplates = templates.filter((t) => t.type === sectionType);
        return (
          <div key={sectionType}>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {SECTION_LABELS[sectionType]}
            </h2>

            {sectionTemplates.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-gray-400 text-sm">
                No {SECTION_LABELS[sectionType].toLowerCase()}s yet
              </div>
            ) : (
              <div className="space-y-3">
                {sectionTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-white border border-gray-200 rounded-lg p-4"
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 text-sm">
                          {template.name}
                        </span>
                        {template.segment && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600">
                            {template.segment}
                          </span>
                        )}
                        {template.industry && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-600">
                            {template.industry}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        {editingId !== template.id && (
                          <>
                            <button
                              onClick={() => startEdit(template)}
                              className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              Edit
                            </button>
                            {template.type !== "BASE" && (
                              <button
                                onClick={() => handleDelete(template.id)}
                                className="text-xs text-red-500 hover:text-red-700 transition-colors"
                              >
                                Delete
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Content area */}
                    {editingId === template.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={8}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => saveEdit(template.id)}
                            disabled={saving}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            {saving ? "Saving…" : "Save"}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <pre className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-3 font-sans">
                        {template.content}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* New Template */}
      <div>
        {showNewForm ? (
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">New Template</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={newForm.name}
                  onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Template name"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Type
                </label>
                <select
                  value={newForm.type}
                  onChange={(e) =>
                    setNewForm((f) => ({
                      ...f,
                      type: e.target.value as "SEGMENT" | "INDUSTRY",
                    }))
                  }
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="SEGMENT">SEGMENT</option>
                  <option value="INDUSTRY">INDUSTRY</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Segment
                </label>
                <input
                  type="text"
                  value={newForm.segment}
                  onChange={(e) => setNewForm((f) => ({ ...f, segment: e.target.value }))}
                  placeholder="e.g. STARTUP"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Industry
                </label>
                <input
                  type="text"
                  value={newForm.industry}
                  onChange={(e) => setNewForm((f) => ({ ...f, industry: e.target.value }))}
                  placeholder="e.g. Healthcare"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Content
              </label>
              <textarea
                value={newForm.content}
                onChange={(e) => setNewForm((f) => ({ ...f, content: e.target.value }))}
                rows={6}
                placeholder="Write your template prompt here…"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCreate}
                disabled={creating || !newForm.name || !newForm.content}
                className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {creating ? "Creating…" : "Create"}
              </button>
              <button
                onClick={() => {
                  setShowNewForm(false);
                  setNewForm({
                    name: "",
                    type: "SEGMENT",
                    segment: "",
                    industry: "",
                    content: "",
                  });
                }}
                className="px-4 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowNewForm(true)}
            className="w-full py-2.5 text-sm font-medium text-blue-600 border border-dashed border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
          >
            + New Template
          </button>
        )}
      </div>
    </div>
  );
}
