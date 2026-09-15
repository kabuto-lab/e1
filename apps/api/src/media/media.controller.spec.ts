import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MediaController } from './media.controller';

const FILE_ID = '66666666-6666-4666-8666-666666666666';
const OWNER_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function makeReq(userId: string, role: string) {
  return { user: { userId, role } } as any;
}

describe('MediaController — ownership check on getById/delete', () => {
  let controller: MediaController;
  let mediaService: { findById: jest.Mock; delete: jest.Mock };

  beforeEach(() => {
    mediaService = {
      findById: jest.fn().mockResolvedValue({ id: FILE_ID, ownerId: OWNER_ID }),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    controller = new MediaController(mediaService as any);
  });

  describe('getById', () => {
    it('allows the owner to view their own file', async () => {
      const result = await controller.getById(FILE_ID, makeReq(OWNER_ID, 'client'));
      expect(result).toEqual({ id: FILE_ID, ownerId: OWNER_ID });
    });

    it('allows staff (admin/manager) to view any file', async () => {
      const result = await controller.getById(FILE_ID, makeReq(OTHER_USER_ID, 'admin'));
      expect(result).toEqual({ id: FILE_ID, ownerId: OWNER_ID });
    });

    it('throws Forbidden for a non-owner, non-staff user (IDOR check)', async () => {
      await expect(controller.getById(FILE_ID, makeReq(OTHER_USER_ID, 'client'))).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws NotFound when the file does not exist', async () => {
      mediaService.findById.mockResolvedValue(null);
      await expect(controller.getById(FILE_ID, makeReq(OWNER_ID, 'client'))).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('delete', () => {
    it('allows the owner to delete their own file', async () => {
      await controller.delete(FILE_ID, makeReq(OWNER_ID, 'client'));
      expect(mediaService.delete).toHaveBeenCalledWith(FILE_ID);
    });

    it('allows staff (admin/manager) to delete any file', async () => {
      await controller.delete(FILE_ID, makeReq(OTHER_USER_ID, 'manager'));
      expect(mediaService.delete).toHaveBeenCalledWith(FILE_ID);
    });

    it('throws Forbidden when a non-owner, non-staff user tries to delete (IDOR check)', async () => {
      await expect(controller.delete(FILE_ID, makeReq(OTHER_USER_ID, 'client'))).rejects.toBeInstanceOf(ForbiddenException);
      expect(mediaService.delete).not.toHaveBeenCalled();
    });

    it('throws NotFound when the file does not exist', async () => {
      mediaService.findById.mockResolvedValue(null);
      await expect(controller.delete(FILE_ID, makeReq(OWNER_ID, 'client'))).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
