"use client";

import { useState } from "react";
import { EmailEditorModal } from "./email-editor-modal";

type EmailStatus = "PENDING" | "GENERATED" | "APPROVED" | "SENT" | "FAILED";

interface EmailContact {
  name: string;
  email: string;
  company: string;
}

interface ReviewEmail {
  id: string;
  subject: string;
  body: string;
  status: EmailStatus;
  contact: EmailContact;
}

interface EmailReviewTableProps {
  emails: ReviewEmail[];
  onRefresh: () => void;
}

const statusBadge: Record<EmailStatus, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-gray-100 text-gray-600" },
  GENERATED: { label: "Generated", className: "bg-blue-100 text-blue-700" },
  APPROVED: { label: "Approved", className: "bg-green-100 text-green-700" },
  SENT: { label: "Sent", className: "bg-emerald-100 text-emerald-800" },
  FAILED: { label: "Failed", className: "bg-red-100 text-red-700" },
};

export function EmailReviewTable({ emails, onRefresh }: EmailReviewTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingEmail, setEditingEmail] = useState<ReviewEmail | null>(null);
  const [approving, setApproving] = useState(false);

  const selectableIds = emails
    .filter((e) => e.status === "GENERATED" || e.status === "APPROVED")
    .map((e) => e.id);

  const allSelected =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selected.has(id));

  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectableIds));
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleApproveSelected() {
    if (selected.size === 0) return;
    setApproving(true);
    try {
      await Promise.all(
        Array.from(selected).map((id) =>
          fetch(`/api/emails/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "APPROVED" }),
          })
        )
      );
      setSelected(new Set());
      onRefresh();
    } finally {
      setApproving(false);
    }
  }

  function handleEditorSaved(updated: ReviewEmail) {
    setEditingEmail(null);
    onRefresh();
  }

  const approvedCount = emails.filter((e) => e.status === "APPROVED").length;

  return (
    <div className="bg-white border border-gray-200 rounded-lg text-sm">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSelectAll}
            className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>
          {selected.size > 0 && (
            <button
              onClick={handleApproveSelected}
              disabled={approving}
              className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {approving ? "Approving…" : `Approve ${selected.size} selected`}
            </button>
          )}
        </div>
        <span className="text-xs text-gray-500">
          {approvedCount} / {emails.length} approved
        </span>
      </div>

      {emails.length === 0 ? (
        <div className="p-8 text-center text-gray-400">No emails in this campaign</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {emails.map((email) => {
            const isSelectable =
              email.status === "GENERATED" || email.status === "APPROVED";
            const isSelected = selected.has(email.id);
            const isExpanded = expanded.has(email.id);
            const badge = statusBadge[email.status];

            return (
              <div key={email.id}>
                {/* Row */}
                <div
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => toggleExpand(email.id)}
                >
                  {/* Checkbox */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isSelectable) toggleSelect(email.id);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      disabled={!isSelectable}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-30 cursor-pointer"
                    />
                  </div>

                  {/* Contact info */}
                  <div className="min-w-0 flex-1 grid grid-cols-3 gap-4 items-center">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {email.contact.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {email.contact.company}
                      </p>
                    </div>
                    <p className="text-gray-700 truncate col-span-2">
                      {email.subject || <span className="text-gray-400 italic">No subject</span>}
                    </p>
                  </div>

                  {/* Status badge */}
                  <span
                    className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${badge.className}`}
                  >
                    {badge.label}
                  </span>

                  {/* Edit button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingEmail(email);
                    }}
                    className="flex-shrink-0 text-xs text-blue-600 hover:text-blue-800 transition-colors px-2 py-1"
                  >
                    Edit
                  </button>

                  {/* Expand chevron */}
                  <span className="text-gray-400 text-xs flex-shrink-0">
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </div>

                {/* Expanded body */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 bg-slate-50 border-t border-gray-100">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                      {email.body || (
                        <span className="text-gray-400 italic">No body generated yet</span>
                      )}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Modal */}
      {editingEmail && (
        <EmailEditorModal
          email={editingEmail}
          onClose={() => setEditingEmail(null)}
          onSaved={handleEditorSaved}
        />
      )}
    </div>
  );
}
