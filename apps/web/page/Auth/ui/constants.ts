import { Mail, MessageCircle, Phone, Send } from 'lucide-react';

const CONTACT_METHOD_LABELS: Record<string, string> = {
    phone: 'Телефон',
    telegram: 'Telegram',
    email: 'E-mail',
    whatsapp: 'WhatsApp',
};

const CONTACT_METHOD_PLACEHOLDERS: Record<string, string> = {
    phone: '+79001234567',
    telegram: '@username',
    email: 'your@email.com',
    whatsapp: '+79001234567',
};

const CONTACT_METHOD_ICONS: Record<string, typeof Phone> = {
    phone: Phone,
    telegram: Send,
    email: Mail,
    whatsapp: MessageCircle,
};

export { CONTACT_METHOD_LABELS, CONTACT_METHOD_PLACEHOLDERS, CONTACT_METHOD_ICONS };
