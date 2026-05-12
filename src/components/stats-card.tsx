export function StatsCard({ label, value, color = "text-blue-600" }: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  );
}
