import TableOrderClient from "@/components/TableOrderClient";

/**
 * Required for static export — pre-generates pages for all tables.
 */
export function generateStaticParams() {
  return [{ tableId: "T1" }, { tableId: "T2" }, { tableId: "T3" }];
}

export default async function TablePage({ params }: { params: Promise<{ tableId: string }> }) {
  const { tableId } = await params;
  return <TableOrderClient tableId={tableId} />;
}
