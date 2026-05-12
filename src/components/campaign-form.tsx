"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ContactSelector } from "@/components/contact-selector";

export function CampaignForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [segment, setSegment] = useState("ALL");
  const [industry, setIndustry] = useState("");
  const [templatePrompt, setTemplatePrompt] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Campaign name is required.");
      return;
    }
    if (selectedIds.length === 0) {
      setError("Select at least one contact.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          segment: segment === "ALL" ? undefined : segment,
          industry: industry.trim() || undefined,
          templatePrompt: templatePrompt.trim() || undefined,
          contactIds: selectedIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create campaign.");
        return;
      }

      const { campaign } = await res.json();
      router.push(`/campaigns/${campaign.id}`);
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Campaign name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Campaign Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. May 2026 Startup Outreach"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Segment */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Segment
        </label>
        <select
          value={segment}
          onChange={(e) => setSegment(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        >
          <option value="ALL">All</option>
          <option value="STARTUP">Startup</option>
          <option value="TRADITIONAL">Traditional</option>
        </select>
      </div>

      {/* Industry */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Industry
        </label>
        <input
          type="text"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          placeholder="e.g. Fintech, Healthcare…"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Strategy notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Strategy Notes
        </label>
        <textarea
          value={templatePrompt}
          onChange={(e) => setTemplatePrompt(e.target.value)}
          rows={3}
          placeholder="Any specific angle or talking points for this campaign…"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Contact selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Contacts <span className="text-red-500">*</span>
        </label>
        <ContactSelector
          selectedIds={selectedIds}
          onChange={setSelectedIds}
          segment={segment}
          industry={industry}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting
          ? "Creating…"
          : `Create & Generate (${selectedIds.length} email${selectedIds.length !== 1 ? "s" : ""})`}
      </button>
    </form>
  );
}
