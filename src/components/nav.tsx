"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const navLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Contacts", href: "/contacts" },
  { label: "Campaigns", href: "/campaigns" },
  { label: "Templates", href: "/templates" },
  { label: "Settings", href: "/settings" },
];

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userName = session?.user?.name ?? undefined;

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center gap-8">
        {/* Logo */}
        <Link href="/dashboard" className="flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://www.pivothire.tech/logo-light-transparent.png"
            alt="PivotHire"
            className="h-6 w-auto"
          />
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-6 flex-1">
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  isActive
                    ? "text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* User avatar */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title={userName ?? "Sign out"}
          className="flex items-center gap-2 group"
        >
          {userName && (
            <span className="text-sm text-gray-500 group-hover:text-gray-700 transition-colors hidden sm:block">
              {userName}
            </span>
          )}
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-semibold flex-shrink-0">
            {getInitials(userName)}
          </span>
        </button>
      </div>
    </nav>
  );
}
