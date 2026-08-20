import { CompleteSignIn } from "./CompleteSignIn";

interface CompletePageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function ConfirmCompletePage({
  searchParams,
}: CompletePageProps) {
  const { next } = await searchParams;
  const target = next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  return <CompleteSignIn next={target} />;
}
