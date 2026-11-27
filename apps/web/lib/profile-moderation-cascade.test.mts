import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CASCADE_REJECT_REASON,
  cascadeProfileDecision,
  pendingMediaIdsForProfile,
  type ProfileDecision,
} from './profile-moderation-cascade.ts';

function fakeDeps(opts: { failProfile?: boolean; failMedia?: string[] } = {}) {
  const calls: unknown[][] = [];
  return {
    calls,
    deps: {
      setProfile: async (profileId: string, d: ProfileDecision) => {
        calls.push(['setProfile', profileId, d]);
        if (opts.failProfile) throw new Error('Нельзя верифицировать анкету без верификационного фото и видео');
      },
      approveMedia: async (mediaId: string) => {
        calls.push(['approve', mediaId]);
        if (opts.failMedia?.includes(mediaId)) throw new Error('boom');
      },
      rejectMedia: async (mediaId: string, reason: string) => {
        calls.push(['reject', mediaId, reason]);
        if (opts.failMedia?.includes(mediaId)) throw new Error('boom');
      },
    },
  };
}

test('pendingMediaIdsForProfile — только файлы этой анкеты, в исходном порядке', () => {
  const media = [
    { id: 'm1', modelId: 'p1' },
    { id: 'x1', modelId: 'p2' },
    { id: 'n1', modelId: null },
    { id: 'm2', modelId: 'p1' },
  ];
  assert.deepEqual(pendingMediaIdsForProfile('p1', media), ['m1', 'm2']);
  assert.deepEqual(pendingMediaIdsForProfile('p3', media), []);
});

test('verified — сначала анкета, затем approve каждого файла', async () => {
  const { calls, deps } = fakeDeps();
  const res = await cascadeProfileDecision('p1', 'verified', ['m1', 'm2'], deps);
  assert.deepEqual(calls, [['setProfile', 'p1', 'verified'], ['approve', 'm1'], ['approve', 'm2']]);
  assert.deepEqual(res, { failedMediaIds: [] });
});

test('rejected — reject каждого файла с причиной «Анкета отклонена»', async () => {
  const { calls, deps } = fakeDeps();
  await cascadeProfileDecision('p1', 'rejected', ['m1', 'm2'], deps);
  assert.equal(CASCADE_REJECT_REASON, 'Анкета отклонена');
  assert.deepEqual(calls, [
    ['setProfile', 'p1', 'rejected'],
    ['reject', 'm1', 'Анкета отклонена'],
    ['reject', 'm2', 'Анкета отклонена'],
  ]);
});

test('ошибка по анкете пробрасывается, файлы не трогаются', async () => {
  const { calls, deps } = fakeDeps({ failProfile: true });
  await assert.rejects(cascadeProfileDecision('p1', 'verified', ['m1'], deps));
  assert.deepEqual(calls, [['setProfile', 'p1', 'verified']]);
});

test('сбой одного файла не останавливает остальные', async () => {
  const { calls, deps } = fakeDeps({ failMedia: ['m1'] });
  const res = await cascadeProfileDecision('p1', 'verified', ['m1', 'm2'], deps);
  assert.deepEqual(calls.slice(1), [['approve', 'm1'], ['approve', 'm2']]);
  assert.deepEqual(res, { failedMediaIds: ['m1'] });
});

test('без файлов — только статус анкеты', async () => {
  const { calls, deps } = fakeDeps();
  const res = await cascadeProfileDecision('p1', 'rejected', [], deps);
  assert.deepEqual(calls, [['setProfile', 'p1', 'rejected']]);
  assert.deepEqual(res, { failedMediaIds: [] });
});
