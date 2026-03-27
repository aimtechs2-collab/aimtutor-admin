import Link from "next/link";

export default function PortalPlaceholder({
  title,
  description,
  primaryHref,
  primaryLabel,
}: {
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-zinc-900">{title}</h2>
      <p className="mt-2 text-sm text-zinc-600">{description}</p>
      {primaryHref && primaryLabel ? (
        <Link
          href={primaryHref}
          className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {primaryLabel}
        </Link>
      ) : null}
    </div>
  );
}
