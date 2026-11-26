import { useLocation } from 'react-router-dom';

/* The current address, to check what a list keeps in the URL. */
export default function Where() {
  const { pathname, search } = useLocation();
  return <div data-testid="where">{pathname + search}</div>;
}
