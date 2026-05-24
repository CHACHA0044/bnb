"use client";

import AdminMenuManager from "@/components/AdminMenuManager";
import { useAdmin } from "../AdminContext";

export default function MenuPage() {
  const { secret, authenticated } = useAdmin();

  if (!authenticated || !secret) return null;

  return (
    <div className="pt-8">
      <AdminMenuManager secret={secret} />
    </div>
  );
}
