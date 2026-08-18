import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Contacts } from '@/page/Contacts';

export default function ContactsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] pt-[var(--site-header-height)]">
      <Header variant="page" segment={{ crumbs: [{ label: 'Контакты' }] }} />
      <Contacts />
      <Footer />
    </div>
  );
}
