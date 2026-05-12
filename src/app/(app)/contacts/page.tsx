"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { ContactTable } from "@/components/contact-table";
import { LlmImportModal } from "@/components/llm-import-modal";

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

type Tab = "mine" | "others";

export default function ContactsPage() {
  const { data: session } = useSession();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("mine");
  const [showImport, setShowImport] = useState(false);

  async function fetchContacts() {
    const res = await fetch("/api/contacts");
    if (res.ok) {
      const data = await res.json();
      setContacts(data);
    }
  }

  useEffect(() => {
    fetchContacts();
  }, []);

  const myContacts = contacts.filter((c) => c.ownerId === session?.user?.id);
  const othersContacts = contacts.filter((c) => c.ownerId !== session?.user?.id);

  const displayed = activeTab === "mine" ? myContacts : othersContacts;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Contacts</h1>
        <button
          onClick={() => setShowImport(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          + LLM Import
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setActiveTab("mine")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === "mine"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          My Contacts ({myContacts.length})
        </button>
        <button
          onClick={() => setActiveTab("others")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === "others"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          Other&apos;s Contacts ({othersContacts.length})
        </button>
      </div>

      <ContactTable contacts={displayed} onRefresh={fetchContacts} />

      {showImport && (
        <LlmImportModal
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false);
            fetchContacts();
          }}
        />
      )}
    </div>
  );
}
