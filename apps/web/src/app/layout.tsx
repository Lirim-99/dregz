import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Drenusha & Egzon — Foto nga dasma',
  description: 'Ndani foto dhe video nga dasma përmes kodit QR',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sq">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Outfit:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="booth-bg" aria-hidden="true" />
        <div className="app-root">{children}</div>
      </body>
    </html>
  );
}
