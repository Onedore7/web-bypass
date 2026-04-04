import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StreamVault — Watch Movies, Dramas & Anime",
  description: "Stream your favourite movies, K-Dramas, anime and more. Powered by PencuriMovie, KissKh and StreamPlay.",
  keywords: "streaming, movies, kdrama, anime, watch online, free streaming",
  openGraph: {
    title: "StreamVault",
    description: "Watch Movies, K-Dramas & Anime for free",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
