import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { LinkButton, NotAvailablePage, type Crumb } from '../../../components/ui';
import * as S from '../../../services/geography';

/*
 * Taluka rollup. The student register does not record a taluka yet, so nothing on this screen has a live source
 * (user decision 24 Nov 2026: no sample figures). The district and taluka names are real geography.
 */
export default function TalukaDetailPage() {
  const { id = '', t: rawT = '' } = useParams();
  useEffect(() => {
    document.title = 'Taluka — SARTHI Admin';
  }, []);

  const d = S.district(id);
  const t = decodeURIComponent(rawT);
  const crumbs: Crumb[] = [
    { l: 'Dashboard', link: '#/dashboard' },
    { l: 'Districts', link: '#/districts' },
    ...(d ? [{ l: d.name, link: '#/districts/' + d.code }] : []),
    { l: t },
  ];

  return (
    <NotAvailablePage
      title={t + ' Taluka'}
      crumbs={crumbs}
      actions={
        d ? (
          <LinkButton to={'#/districts/' + d.code} icon="chevL">
            Back to district
          </LinkButton>
        ) : undefined
      }
    />
  );
}
