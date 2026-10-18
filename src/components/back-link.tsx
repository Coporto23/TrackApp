import Link from "next/link";
import { BackIcon } from "./icons";

export function BackLink({ href, label }: { href: "/"; label: string }) {
  return (
    <Link
      href={href}
      className="-ml-2 mb-4 inline-flex items-center gap-1 py-2 pr-2 font-display text-xs tracking-[0.15em] text-fog uppercase hover:text-bone"
    >
      <BackIcon className="h-4 w-4" />
      {label}
    </Link>
  );
}
