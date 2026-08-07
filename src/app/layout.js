import "./globals.css";
import { Nav } from "@/components/ui";

export const metadata = {
  title: "Liga eFootball",
  description: "Klasemen, jadwal, dan hasil liga eFootball Mobile.",
};

export const viewport = {
  themeColor: "#1a0808",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        {children}
        <Nav />
      </body>
    </html>
  );
}
