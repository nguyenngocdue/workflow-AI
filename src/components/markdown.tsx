"use client";

interface MarkdownProps {
  children: string;
  className?: string;
}

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={className}>
      <pre className="whitespace-pre-wrap text-sm">{children}</pre>
    </div>
  );
}

export default Markdown;
