import { memo } from 'react';
import ReactMarkdown from 'react-markdown';

/**
 * Loaded on demand (React.lazy in MessageBubble) so the markdown parser stays out of the first page load.
 * Memoized: an unchanged message is never re-parsed while a later message streams.
 */
function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown components={{ a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" /> }}>
      {children}
    </ReactMarkdown>
  );
}

export default memo(Markdown);
