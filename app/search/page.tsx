import SearchExperience from "@/components/search-experience";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; state?: string }>;
}) {
  const p = await searchParams;
  return (
    <SearchExperience
      key={`${p.q}:${p.state}`}
      query={(p.q ?? "").slice(0, 1000)}
      initialState={p.state}
    />
  );
}
