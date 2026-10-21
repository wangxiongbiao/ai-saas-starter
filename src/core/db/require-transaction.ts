import { envConfigs } from '@/config';

/** D1's compatibility wrapper cannot roll back callback transactions. */
export function requireCreditTransaction() {
  if (envConfigs.database_provider === 'd1') {
    throw new Error('Credit mutations require a transactional database; D1 is not supported');
  }
}
