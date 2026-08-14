import { MaintenanceNotice } from '@/components/ui-states/MaintenanceNotice';

export const metadata = {
  title: 'Manutenção Programada',
  robots: { index: false, follow: false },
};

export default function MaintenancePage() {
  return <MaintenanceNotice estimatedReturn="Em breve" />;
}
