"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";

/** Copies the current page URL. Works without SITE_URL being configured. */
export function CopyLinkButton({ className }: { className: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      const url = new URL(window.location.href);
      url.hash = "";
      await navigator.clipboard.writeText(url.toString());
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <>
      <button type="button" onClick={copy} className={className}>
        {status === "copied" ? (
          <Check aria-hidden="true" className="size-4" />
        ) : (
          <Link2 aria-hidden="true" className="size-4" />
        )}
        {status === "copied" ? "Copied!" : "Copy link"}
      </button>
      <span role="status" className="sr-only">
        {status === "copied" ? "Link copied to clipboard." : status === "failed" ? "Couldn’t copy the link." : ""}
      </span>
    </>
  );
}
