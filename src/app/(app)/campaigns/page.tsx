"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface CampaignCreator {
  id: string;
  name: string;
}

interface Campaign {
  id: string;
  name: string;
  status: "DRAFT" | "GENERATING" | "REVIEW" | "SENDING" | "COMPLETED";
  createdBy: CampaignCreator;
  _count: { emails: number };
  createdAt: string;
}

const statusConfig: Record<
  Campaign["status"],
  { label: string; className: string }
> = {
  DRAFT: { label: "Draft", className: "bg-gray-100 text-gray-600" },
  GENERATING: { label: "Generating", className: "bg-purple-100 text-purple-700" },
  REVIEW: { label: "Review", className: "bg-amber-100 text-amber-700" },
  SENDING: { label: "Sending", className: "bg-blue-100 text-blue-700" },
  COMPLETED: { label: "Completed", className: "bg-green-100 text-green-700" },
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((data: Campaign[]) => {
        setCampaigns(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Campaigns</h1>
        <Link
          href="/campaigns/new"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          + New Campaign
        </Link>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center">
          Loading campaigns…
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium mb-1">No campaigns yet</p>
          <p className="text-sm mb-4">
            Create your first campaign to start sending personalised emails.
          </p>
          <Link
            href="/campaigns/new"
            className="inline-block px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            + New Campaign
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => {
            const { label, className } = statusConfig[campaign.status];
            return (
              <Link
                key={campaign.id}
                href={`/campaigns/${campaign.id}`}
                className="block bg-white rounded-lg border border-gray-200 px-5 py-4 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {campaign.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Created by {campaign.createdBy.name} ·{" "}
                      {campaign._count.emails} email
                      {campaign._count.emails !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${className}`}
                  >
                    {label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
