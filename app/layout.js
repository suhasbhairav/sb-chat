import "./globals.css";

export const metadata = {
  title: "Batuk",
  description: "A Next.js chat interface for Ollama, OpenRouter, OpenAI, and OpenAI-compatible models.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
