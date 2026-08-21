import ApartmentsClient from "./apartments-client";

export const instant = false; // Funciona porque ahora es Server Component

export default function ApartmentsPage() {
  return <ApartmentsClient />;
}