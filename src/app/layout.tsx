import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PPK MOVIE — Watch Movies, TV Shows & Anime",
  description: "Stream your favourite movies, TV shows, anime and more. Powered by PPK MOVIE.",
  keywords: "streaming, movies, tv shows, anime, watch online, free streaming, ppk movie",
  openGraph: {
    title: "PPK MOVIE",
    description: "Watch Movies, TV Shows & Anime for free",
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
