import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Familytape Share | 우리 가족 비디오 공유",
  description: "가족들과 함께 나누는 소중한 비디오 스트리밍",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <script src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1" defer></script>
      </head>
      <body className="antialiased selection:bg-blue-600/30 bg-[#f8fafc] dark:bg-[#09090b] min-h-screen text-zinc-900 dark:text-zinc-100" style={{ fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
