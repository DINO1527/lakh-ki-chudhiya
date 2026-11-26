import { redirect } from "next/navigation";

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<never> {
  const { slug } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) redirect("/shop");
  redirect(`/shop?collection=${encodeURIComponent(slug)}`);
}
