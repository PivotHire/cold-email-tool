"use client";

import { useEffect, useState } from "react";
import { TemplateEditor } from "@/components/template-editor";

interface Template {
  id: string;
  name: string;
  type: "BASE" | "SEGMENT" | "INDUSTRY";
  segment?: string | null;
  industry?: string | null;
  content: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);

  async function fetchTemplates() {
    const res = await fetch("/api/templates");
    if (res.ok) {
      const data = await res.json();
      setTemplates(data);
    }
  }

  useEffect(() => {
    fetchTemplates();
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Prompt Templates</h1>
        <p className="text-sm text-gray-500 mt-1">
          Templates are applied in a hierarchy: BASE sets the foundation, SEGMENT overrides
          for contact type, and INDUSTRY further specializes by vertical.
        </p>
      </div>

      <TemplateEditor templates={templates} onRefresh={fetchTemplates} />
    </div>
  );
}
