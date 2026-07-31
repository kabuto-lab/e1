import { redirect } from 'next/navigation';

/** Управление программами мастера перенесено на верхний уровень: /dashboard/masters/[id]/programs. */
export default async function MassageMasterProgramsRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/masters/${id}/programs`);
}
