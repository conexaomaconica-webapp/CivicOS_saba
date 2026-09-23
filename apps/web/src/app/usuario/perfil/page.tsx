import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Meu Perfil & Segurança',
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  redirect('/minha-conta/perfil');
}
