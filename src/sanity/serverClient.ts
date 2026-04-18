import 'server-only';
import { createClient } from 'next-sanity';
import { projectId, dataset, apiVersion } from './env';
import { getServerEnv } from '@/lib/env';

export function getSanityWriteClient() {
  const { SANITY_API_WRITE_TOKEN } = getServerEnv();
  return createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
    token: SANITY_API_WRITE_TOKEN,
  });
}
