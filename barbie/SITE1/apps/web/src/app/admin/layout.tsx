import { AdminShell } from './AdminShell';

export const metadata = {
  title: 'NAS · Admin',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
