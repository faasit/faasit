import { ft_utils } from '@faasit/core';
import { z } from 'zod';

const AliyunSecretSchema = z.object({
  accessKeyId: z.string(),
  accessKeySecret: z.string(),
  accountId: z.string(),
  region: z.string(),
})

export type AliyunSecretType = z.infer<typeof AliyunSecretSchema>
export function parseAliyunSecret(env: Record<string, string | undefined>): AliyunSecretType {
  const obj: Partial<AliyunSecretType> = {
    accessKeyId: env.FAASIT_SECRET_ALIYUN_ACCESS_KEY_ID,
    accessKeySecret: env.FAASIT_SECRET_ALIYUN_ACCESS_KEY_SECRET,
    accountId: env.FAASIT_SECRET_ALIYUN_ACCOUNT_ID,
    region: env.FAASIT_SECRET_ALIYUN_REGION,
  }
  return ft_utils.parseZod(AliyunSecretSchema, obj, `failed to parse aliyun secret from env`)
}