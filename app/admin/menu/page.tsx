"use client";

import AdminMenuManager from "@/components/AdminMenuManager";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export default function MenuPage() {
  const { secret, authenticated } = useAdminAuth();

  if (!authenticated || !secret) return null;

  return (
    <div className="pt-8">
      <AdminMenuManager secret={secret} />
    </div>
  );
}
