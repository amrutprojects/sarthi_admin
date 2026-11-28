import { useAuth } from '../../auth';

/*
 * Whether the screens of IPP Approvals name who decided. Divisional Officers, COEP and Head Officers (the IPP workspace,
 * portal 'ipp') see the role only: "Approved by COEP", not "Approved by Keshav Mahale (COEP)". The full panel (a Super
 * Admin, an administrator) sees the name with the role, as the Auditor of IPP does in IPP.
 */
export const useShowNames = (): boolean => useAuth().portal !== 'ipp';
