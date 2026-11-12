import { SANDBOX_ATTR, withCsp } from "@/lib/sandbox";

/**
 * Model-written HTML never touches the app DOM. It is shown only through
 * srcdoc in an iframe whose sandbox grants scripts and nothing else.
 */
export function HtmlPanel({ document, title }: { document: string; title: string }) {
  return (
    <iframe
      title={title}
      sandbox={SANDBOX_ATTR}
      srcDoc={withCsp(document)}
      referrerPolicy="no-referrer"
      loading="lazy"
      className="block h-full w-full border-0 bg-white"
    />
  );
}
