import { CampaignForm } from "@/components/campaign-form";

export default function NewCampaignPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">
        New Campaign
      </h1>
      <CampaignForm />
    </div>
  );
}
