"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { EmailReviewTable } from "@/components/email-review-table";

type CampaignStatus = "DRAFT" | "GENERATING" | "REVIEW" | "SENDING" | "COMPLETED";
type EmailStatus = "PENDING" | "GENERATED" | "APPROVED" | "SENT" | "FAILED";

interface EmailContact {
  name: string;
  email: string;
  company: string;
}

interface CampaignEmail {
  id: string;
  subject: string;
  body: string;
  status: EmailStatus;
  contact: EmailContact;
}

interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  emails: CampaignEmail[];
}

const statusConfig: Record<CampaignStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-gray-100 text-gray-600" },
  GENERATING: { label: "Generating", className: "bg-purple-100 text-purple-700" },
  REVIEW: { label: "Review", className: "bg-amber-100 text-amber-700" },
  SENDING: { label: "Sending", className: "bg-blue-100 text-blue-700" },
  COMPLETED: { label: "Completed", className: "bg-green-100 text-green-700" },
};

export default function CampaignReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchCampaign = useCallback(async () => {
    const res = await fetch(`/api/campaigns/${id}`);
    if (res.ok) {
      const data: Campaign = await res.json();
      setCampaign(data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  async function handleGenerateRemaining() {
    if (!campaign) return;
    setGenerating(true);
    try {
      let remaining = 1;
      while (remaining > 0) {
        const res = await fetch(`/api/campaigns/${id}/generate`, {
          method: "POST",
        });
        if (!res.ok) break;
        const data: { generated: number; remaining: number } = await res.json();
        remaining = data.remaining;
      }
      await fetchCampaign();
    } finally {
      setGenerating(false);
    }
  }

  async function handleSendApproved() {
    if (!campaign) return;
    setSending(true);
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SENDING" }),
      });
      if (res.ok) {
        await fetchCampaign();
      }
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="text-sm text-gray-400 py-8 text-center">
        Loading campaign…
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-sm text-red-500 py-8 text-center">
        Campaign not found.
      </div>
    );
  }

  const pendingEmails = campaign.emails.filter((e) => e.status === "PENDING");
  const approvedEmails = campaign.emails.filter((e) => e.status === "APPROVED");
  const hasPending = pendingEmails.length > 0;
  const hasApproved = approvedEmails.length > 0;
  const canSend = hasApproved && campaign.status === "REVIEW";

  const { label, className } = statusConfig[campaign.status];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold text-gray-900 truncate">
              {campaign.name}
            </h1>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${className}`}
            >
              {label}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {campaign.emails.length} email{campaign.emails.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasPending && (
            <button
              onClick={handleGenerateRemaining}
              disabled={generating}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {generating
                ? "Generating…"
                : `Generate Remaining (${pendingEmails.length})`}
            </button>
          )}
          {canSend && (
            <button
              onClick={handleSendApproved}
              disabled={sending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {sending
                ? "Starting…"
                : `Send ${approvedEmails.length} Approved`}
            </button>
          )}
        </div>
      </div>

      {/* Email review table */}
      <EmailReviewTable emails={campaign.emails} onRefresh={fetchCampaign} />
    </div>
  );
}
