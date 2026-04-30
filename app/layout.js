import "./globals.css";

export const metadata = {
  title: "WEBSCOPE — Multi-Layer Web Intelligence",
  description: "Production web scraping platform for Surface, Deep, and Dark web extraction",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head />
      <body>{children}</body>
    </html>
  );
}