import { PermissionDenied } from '@/components/aux/PermissionDenied';

export const metadata = {
  title: 'Acesso Negado',
};

export default function AccessDeniedPage() {
  return <PermissionDenied />;
}