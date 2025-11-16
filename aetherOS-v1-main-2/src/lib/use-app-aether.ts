
'use client';

import { useContext } from "react";
import { AetherAppContext } from "@/components/aether-os/aether-app-context";

/**
 * Scoped Aether client hook.
 * Injects `appId` automatically so the kernel’s PermissionManager
 * can enforce per-app permissions.
 */
export function useAppAether() {
  const ctx = useContext(AetherAppContext);
  if (!ctx) throw new Error("useAppAether must be used inside an <AetherAppProvider />");

  return ctx.client;
}
