import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { StatsCard } from "@/components/stats-card";

type CampaignStatus = "DRAFT" | "GENERATING" | "REVIEW" | "SENDING" | "COMPLETED";

const statusConfig: Record<CampaignStatus, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-gray-100 text-gray-600" },
  GENERATING: { label: "Generating", className: "bg-purple-100 text-purple-700" },
  REVIEW: { label: "Review", className: "bg-amber-100 text-amber-700" },
  SENDING: { label: "Sending", className: "bg-blue-100 text-blue-700" },
  COMPLETED: { label: "Completed", className: "bg-green-100 text-green-700" },
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id as string;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    sentThisWeek,
    totalSent,
    uniqueOpens,
    uniqueClicks,
    newContacts,
    recentCampaigns,
  ] = await Promise.all([
    // Emails sent this week for campaigns owned by user
    prisma.email.count({
      where: {
        status: "SENT",
        sentAt: { gte: sevenDaysAgo },
        campaign: { createdById: userId },
      },
    }),

    // Total emails sent for campaigns owned by user
    prisma.email.count({
      where: {
        status: "SENT",
        campaign: { createdById: userId },
      },
    }),

    // Unique email opens (group by emailId)
    prisma.trackingEvent.groupBy({
      by: ["emailId"],
      where: {
        type: "OPEN",
        email: { campaign: { createdById: userId } },
      },
    }),

    // Unique email clicks (group by emailId)
    prisma.trackingEvent.groupBy({
      by: ["emailId"],
      where: {
        type: "CLICK",
        email: { campaign: { createdById: userId } },
      },
    }),

    // New contacts added automatically in the last 7 days
    prisma.contact.count({
      where: {
        source: { not: "manual" },
        createdAt: { gte: sevenDaysAgo },
      },
    }),

    // Recent 5 campaigns for the user
    prisma.campaign.findMany({
      where: { createdById: userId },
      include: { _count: { select: { emails: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const openRate = totalSent > 0 ? Math.round((uniqueOpens.length / totalSent) * 100) : 0;
  const clickRate = totalSent > 0 ? Math.round((uniqueClicks.length / totalSent) * 100) : 0;

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatsCard label="Sent this week" value={sentThisWeek} color="text-blue-600" />
        <StatsCard label="Open rate" value={`${openRate}%`} color="text-green-600" />
        <StatsCard label="Click rate" value={`${clickRate}%`} color="text-orange-500" />
        <StatsCard label="New contacts (auto)" value={newContacts} color="text-purple-600" />
      </div>

      {/* Recent Campaigns */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Recent Campaigns</h2>
        </div>

        {recentCampaigns.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">
            No campaigns yet.{" "}
            <Link href="/campaigns/new" className="text-blue-600 hover:underline">
              Create your first campaign
            </Link>
            .
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recentCampaigns.map((campaign) => {
              const status = campaign.status as CampaignStatus;
              const { label, className } = statusConfig[status];
              return (
                <li key={campaign.id}>
                  <Link
                    href={`/campaigns/${campaign.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {campaign.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {campaign._count.emails} email{campaign._count.emails !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <span
                      className={`ml-4 flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${className}`}
                    >
                      {label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
