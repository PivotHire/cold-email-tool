"use client";

interface LlmImportModalProps {
  onClose: () => void;
  onImported: () => void;
}

export function LlmImportModal({ onClose }: LlmImportModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">LLM Import</h2>
        <p className="text-gray-500 text-sm mb-6">Coming in next task...</p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
