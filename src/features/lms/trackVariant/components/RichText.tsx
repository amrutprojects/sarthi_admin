import { Html } from '../../../../components/ui';
import { isAllowedRichText } from '../validation/richText';

/*
 * Stored rich text. The server accepts only allow-listed markup (paragraphs, bold, italic, lists, https links); the
 * same check runs here before the text is rendered as markup, so anything else is shown as plain text.
 */
export default function RichText({ text, empty = '—' }: { text: string | null; empty?: string }) {
  if (!text) return <span className="muted">{empty}</span>;
  if (isAllowedRichText(text)) return <Html className="fs13" html={text} />;
  return <div className="fs13" style={{ whiteSpace: 'pre-wrap' }}>{text}</div>;
}
