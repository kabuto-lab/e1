import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ModelsController } from './models.controller';
import type { RequestWithUser } from '../auth/guards/jwt-auth.guard';

const MODEL_PROFILE_ID = '33333333-3333-4333-8333-333333333333';
const MODEL_USER_ID = '44444444-4444-4444-8444-444444444444';
const MANAGER_ID = '55555555-5555-4555-8555-555555555555';
const OTHER_USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function makeReq(userId: string, role: string): RequestWithUser {
  return { user: { userId, role } } as unknown as RequestWithUser;
}

describe('ModelsController.update — ownership check', () => {
  let controller: ModelsController;
  let modelsService: { findById: jest.Mock; updateProfile: jest.Mock };
  let employeesService: { getAccess: jest.Mock };

  const baseProfile = () => ({ id: MODEL_PROFILE_ID, userId: MODEL_USER_ID, managerId: MANAGER_ID } as any);

  beforeEach(() => {
    modelsService = {
      findById: jest.fn().mockResolvedValue(baseProfile()),
      updateProfile: jest.fn().mockImplementation((id, patch) => Promise.resolve({ ...baseProfile(), ...patch })),
    };
    employeesService = { getAccess: jest.fn().mockResolvedValue(null) };

    // Прямая конструкция контроллера (без Test.createTestingModule) — методы вызываются
    // напрямую, минуя HTTP/guard pipeline, так что гварды (@UseGuards) резолвить не нужно.
    controller = new ModelsController(modelsService as any, {} as any, {} as any, employeesService as any);
  });

  it('throws NotFound when the profile does not exist', async () => {
    modelsService.findById.mockResolvedValue(null);
    await expect(
      controller.update(makeReq(MODEL_USER_ID, 'model'), MODEL_PROFILE_ID, { displayName: 'x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('allows a model to edit her own profile', async () => {
    await controller.update(makeReq(MODEL_USER_ID, 'model'), MODEL_PROFILE_ID, { displayName: 'New name' });
    expect(modelsService.updateProfile).toHaveBeenCalledWith(MODEL_PROFILE_ID, expect.objectContaining({ displayName: 'New name' }));
  });

  it('throws Forbidden when a model tries to edit another model\'s profile (IDOR check)', async () => {
    await expect(
      controller.update(makeReq(OTHER_USER_ID, 'model'), MODEL_PROFILE_ID, { displayName: 'Hijacked' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(modelsService.updateProfile).not.toHaveBeenCalled();
  });

  it('allows the assigned manager to edit any field of their own model', async () => {
    await controller.update(makeReq(MANAGER_ID, 'manager'), MODEL_PROFILE_ID, { rateHourly: '5000.00', isPublished: true });
    expect(modelsService.updateProfile).toHaveBeenCalledWith(
      MODEL_PROFILE_ID,
      expect.objectContaining({ rateHourly: '5000.00', isPublished: true }),
    );
  });

  it('throws Forbidden when a manager tries to edit a model they do not manage (IDOR check)', async () => {
    await expect(
      controller.update(makeReq(OTHER_USER_ID, 'manager'), MODEL_PROFILE_ID, { rateHourly: '1.00' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(modelsService.updateProfile).not.toHaveBeenCalled();
  });

  it('strips managerCommissionRate/platformCommissionRate for a manager editing their own model', async () => {
    await controller.update(makeReq(MANAGER_ID, 'manager'), MODEL_PROFILE_ID, {
      managerCommissionRate: '0.900',
      platformCommissionRate: '0',
    } as any);
    const patch = modelsService.updateProfile.mock.calls[0][1];
    expect(patch.managerCommissionRate).toBeUndefined();
    expect(patch.platformCommissionRate).toBeUndefined();
  });

  it('allows admin to set commission rates on any model', async () => {
    await controller.update(makeReq(OTHER_USER_ID, 'admin'), MODEL_PROFILE_ID, {
      managerCommissionRate: '0.900',
    } as any);
    const patch = modelsService.updateProfile.mock.calls[0][1];
    expect(patch.managerCommissionRate).toBe('0.900');
  });

  it('allows an employee with canEditModels for their manager\'s model', async () => {
    employeesService.getAccess.mockResolvedValue({ managerId: MANAGER_ID, canEditModels: true });
    await controller.update(makeReq(OTHER_USER_ID, 'employee'), MODEL_PROFILE_ID, { displayName: 'Edited by employee' });
    expect(modelsService.updateProfile).toHaveBeenCalled();
  });

  it('strips isPublished for an employee even with canEditModels', async () => {
    employeesService.getAccess.mockResolvedValue({ managerId: MANAGER_ID, canEditModels: true });
    await controller.update(makeReq(OTHER_USER_ID, 'employee'), MODEL_PROFILE_ID, { isPublished: false } as any);
    const patch = modelsService.updateProfile.mock.calls[0][1];
    expect(patch.isPublished).toBeUndefined();
  });

  it('throws Forbidden for an employee without canEditModels', async () => {
    employeesService.getAccess.mockResolvedValue({ managerId: MANAGER_ID, canEditModels: false });
    await expect(
      controller.update(makeReq(OTHER_USER_ID, 'employee'), MODEL_PROFILE_ID, { displayName: 'x' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
