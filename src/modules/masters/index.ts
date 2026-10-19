/* Public API of the masters module. Other modules import only from here (npm run check:boundaries). */
export { MASTERS, type MasterConfig, type MasterKey } from './config';
export { useMasterOptions } from './hooks/useMasters';
export type { MasterOption, MasterRecord } from './types';
