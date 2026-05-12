"use client";

import { useEffect, useState } from "react";

interface Contact {
  id: string;
  name: string;
  email: string;
  company: string;
  segment: "STARTUP" | "TRADITIONAL";
}

interface ContactSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  segment?: string;
  industry?: string;
}

export function ContactSelector({
  selectedIds,
  onChange,
  segment,
  industry,
}: ContactSelectorProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (segment && segment !== "ALL") params.set("segment", segment);
    if (industry) params.set("industry", industry);

    const url = `/api/contacts${params.toString() ? `?${params}` : ""}`;

    setLoading(true);
    fetch(url)
      .then((r) => r.json())
      .then((data: Contact[]) => {
        setContacts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [segment, industry]);

  const allSelected =
    contacts.length > 0 && contacts.every((c) => selectedIds.includes(c.id));

  function toggleAll() {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(contacts.map((c) => c.id));
    }
  }

  function toggleOne(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  if (loading) {
    return (
      <div className="text-sm text-gray-400 py-4 text-center">
        Loading contacts…
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="text-sm text-gray-400 py-4 text-center">
        No contacts match the current filters.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Select all ({contacts.length})
        </label>
        <span className="text-sm text-gray-500">
          {selectedIds.length} selected
        </span>
      </div>

      <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md divide-y divide-gray-100">
        {contacts.map((contact) => {
          const checked = selectedIds.includes(contact.id);
          return (
            <label
              key={contact.id}
              className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 select-none"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleOne(contact.id)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {contact.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {contact.email} · {contact.company}
                </p>
              </div>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                  contact.segment === "STARTUP"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {contact.segment === "STARTUP" ? "Startup" : "Traditional"}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
