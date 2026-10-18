import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { deleteWebsiteReplayChunks, logReplayStoreError } from '@/lib/replay-store';
import { sanitizeSortFilters } from '@/lib/sort';
import type { PageResult, QueryFilters, Role } from '@/lib/types';
import { deleteWebsiteRecords } from './website';

import UserFindManyArgs = Prisma.UserFindManyArgs;

const USER_SORT_FIELDS = ['username', 'role', 'createdAt'] as const;

interface GetUserOptions {
  includePassword?: boolean;
  showDeleted?: boolean;
}

interface UserSummary {
  id: string;
  username: string;
  role: string;
  createdAt: Date;
  twoFactorRequired: boolean;
  _count?: {
    websites: number;
  };
}

async function findUser(criteria: Prisma.UserFindUniqueArgs, options: GetUserOptions = {}) {
  const { includePassword = false, showDeleted = false } = options;

  return prisma.client.user.findUnique({
    ...criteria,
    where: {
      ...criteria.where,
      ...(showDeleted ? {} : { deletedAt: null }),
    },
    select: {
      id: true,
      username: true,
      password: includePassword,
      role: true,
      createdAt: true,
      twoFactorRequired: true,
    },
  });
}

export async function getUser(userId: string, options: GetUserOptions = {}) {
  return findUser(
    {
      where: {
        id: userId,
      },
    },
    options,
  );
}

export async function getUserByUsername(username: string, options: GetUserOptions = {}) {
  return findUser({ where: { username: username.toLowerCase() } }, options);
}

export async function getUsers(
  criteria: UserFindManyArgs,
  filters: QueryFilters = {},
): Promise<PageResult<UserSummary[]>> {
  const sortFilters = sanitizeSortFilters(filters, USER_SORT_FIELDS, {
    orderBy: 'createdAt',
    sortDescending: true,
  });
  const { search } = sortFilters;

  const where: Prisma.UserWhereInput = {
    ...criteria.where,
    ...prisma.getSearchParameters(search, [{ username: 'contains' }]),
    deletedAt: null,
  };

  return prisma.pagedQuery(
    'user',
    {
      ...criteria,
      where,
    },
    sortFilters,
  );
}

export async function createUser(data: {
  id: string;
  username: string;
  password: string;
  role: Role;
}) {
  return prisma.client.user.create({
    data,
    select: {
      id: true,
      username: true,
      role: true,
    },
  });
}

export async function updateUser(userId: string, data: Prisma.UserUpdateInput) {
  return prisma.client.user.update({
    where: {
      id: userId,
    },
    data,
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true,
    },
  });
}

export async function deleteUser(userId: string) {
  const { client, transaction } = prisma;

  const websites = await client.website.findMany({
    where: { userId },
    select: { id: true },
  });

  const user = await transaction(
    async tx => {
      for (const { id } of websites) {
        await deleteWebsiteRecords(tx, id);
      }

      // Reports the user saved on other websites; API keys, visitor labels and 2FA rows
      // cascade from the user (emulated by Prisma under relationMode "prisma").
      await tx.report.deleteMany({
        where: { userId },
      });

      return tx.user.delete({
        where: { id: userId },
      });
    },
    {
      timeout: 60000,
    },
  );

  for (const { id } of websites) {
    await deleteWebsiteReplayChunks(id).catch(logReplayStoreError);
  }

  return user;
}
