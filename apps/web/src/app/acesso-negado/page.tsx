import { PermissionDenied } from '@/components/ui-states/PermissionDenied';

export const metadata = {
  title: 'Acesso Negado',
  robots: { index: false, follow: false },
};

export default function AccessDeniedPage() {
  return <PermissionDenied />;
}
