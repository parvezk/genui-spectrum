import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function TextPanel({ markdown }: { markdown: string }) {
  return (
    <div className="md p-4">
      <Markdown remarkPlugins={[remarkGfm]}>{markdown}</Markdown>
    </div>
  );
}
