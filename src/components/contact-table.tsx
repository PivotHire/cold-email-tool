"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

interface Owner {
  id: string;
  name: string;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  company: string;
  title?: string | null;
  segment: "STARTUP" | "TRADITIONAL";
  source: string;
  owner: Owner;
  ownerId: string;
}

interface ContactTableProps {
  contacts: Contact[];
  onRefresh: () => void;
}

export function ContactTable({ contacts, onRefresh }: ContactTableProps) {
  const { data: session } = useSession();
  const [search, setSearch] = useState("");

  const filtered = contacts.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q)
    );
  });

  async function handleDelete(id: string) {
    await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    onRefresh();
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg text-sm">
      <div className="p-4 border-b border-gray-200">
        <input
          type="text"
          placeholder="Search by name, email, or company…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center text-gray-400">No contacts found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Company</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Segment</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Source</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Owner</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((contact) => (
                <tr
                  key={contact.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{contact.name}</div>
                    <div className="text-gray-400 text-xs">{contact.email}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{contact.company}</td>
                  <td className="px-4 py-3 text-gray-500">{contact.title ?? "—"}</td>
                  <td className="px-4 py-3">
                    {contact.segment === "STARTUP" ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600">
                        Startup
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-600">
                        Traditional
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{contact.source}</td>
                  <td className="px-4 py-3 text-gray-500">{contact.owner.name}</td>
                  <td className="px-4 py-3 text-right">
                    {session?.user?.id === contact.ownerId && (
                      <button
                        onClick={() => handleDelete(contact.id)}
                        className="text-xs text-red-500 hover:text-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
