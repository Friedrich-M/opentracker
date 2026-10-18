import { z } from 'zod';

export const loginRequestSchema = z
  .object({
    username: z.string().meta({ description: 'Username.' }),
    password: z.string().meta({ description: 'Password.' }),
  })
  .meta({ id: 'LoginRequest' });
