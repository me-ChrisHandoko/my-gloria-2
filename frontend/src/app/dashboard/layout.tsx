/**
 * Dashboard Layout
 * Note: Auth protection is handled by the parent (dashboard) layout
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}