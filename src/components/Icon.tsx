import AS from '../legacy';

/* Renders the shared SVG icon set from the original UI library. */
export default function Icon({ name, className }: { name: string; className?: string }) {
  return <span className="ico-wrap" style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: AS.ui.icon(name, className) }} />;
}
