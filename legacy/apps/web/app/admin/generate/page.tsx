import { GenerationConsole } from "../../../components/GenerationConsole";
import type { SectionKey } from "../../../components/GenerationConsole";
import { api } from "../../../lib/api";

const validSections: SectionKey[] = ["import", "settings", "setup", "generate", "edit", "export"];

const parseSection = (value: string | undefined): SectionKey => {
  if (!value) return "import";
  return validSections.includes(value as SectionKey) ? (value as SectionKey) : "import";
};

export default async function GeneratePage({
  searchParams
}: {
  searchParams?: { section?: string };
}): Promise<JSX.Element> {
  const dataset = await api.getExampleDataset();
  const section = parseSection(searchParams?.section);
  return <GenerationConsole initialPayload={dataset} initialSection={section} />;
}
