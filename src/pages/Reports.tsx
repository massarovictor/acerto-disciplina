import { Navigate, useLocation } from 'react-router-dom';

const Reports = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const tab = (params.get('tab') || '').toLowerCase();
  params.delete('tab');
  const nextSearch = params.toString();

  const pathname =
    tab === 'slides'
      ? '/slides'
      : tab === 'certificates'
        ? '/certificados'
        : '/relatorios-integrados';

  return (
    <Navigate
      to={{
        pathname,
        search: nextSearch ? `?${nextSearch}` : '',
        hash: location.hash,
      }}
      replace
    />
  );
};

export default Reports;

