import { MaintenanceNotice } from '@/components/aux/MaintenanceNotice';

export const metadata = {
  title: 'Manutenção Programada',
};

export default function MaintenancePage() {
  return <MaintenanceNotice estimatedReturn="Em breve" />;
}