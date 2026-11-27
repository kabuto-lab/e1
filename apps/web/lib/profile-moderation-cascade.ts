/**
 * Каскад решения модератора по анкете на её файлы в очереди: «Верифицировать» анкету —
 * принять все её ожидающие фото/видео/документы, «Отклонить» — отклонить их.
 * Сначала статус анкеты; если бэкенд отказал (напр. нет верификационного фото/видео) —
 * файлы не трогаем. Файлы — последовательно, сбой одного не останавливает остальные.
 * API инжектится, чтобы логику можно было проверить без сети (см. .test.mts).
 */

export type ProfileDecision = 'verified' | 'rejected';

export const CASCADE_REJECT_REASON = 'Анкета отклонена';

export function pendingMediaIdsForProfile(
  profileId: string,
  media: { id: string; modelId: string | null }[],
): string[] {
  return media.filter((m) => m.modelId === profileId).map((m) => m.id);
}

export async function cascadeProfileDecision(
  profileId: string,
  decision: ProfileDecision,
  mediaIds: string[],
  deps: {
    setProfile: (profileId: string, d: ProfileDecision) => Promise<unknown>;
    approveMedia: (mediaId: string) => Promise<unknown>;
    rejectMedia: (mediaId: string, reason: string) => Promise<unknown>;
  },
): Promise<{ failedMediaIds: string[] }> {
  await deps.setProfile(profileId, decision);

  const failedMediaIds: string[] = [];
  for (const id of mediaIds) {
    try {
      if (decision === 'verified') await deps.approveMedia(id);
      else await deps.rejectMedia(id, CASCADE_REJECT_REASON);
    } catch {
      failedMediaIds.push(id);
    }
  }
  return { failedMediaIds };
}
