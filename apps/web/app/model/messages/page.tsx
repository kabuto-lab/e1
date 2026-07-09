'use client';

import { useAuth } from '@/components/AuthProvider';
import ChatPanel from '@/components/ChatPanel';

export default function ModelMessagesPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold text-white">Сообщения</h1>
      <ChatPanel currentUserId={user.id} />
    </div>
  );
}
