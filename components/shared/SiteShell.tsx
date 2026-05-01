import { ReactNode } from "react";
import PromoBar from "./PromoBar";
import Header from "./Header";
import Footer from "./Footer";
import WhatsAppFab from "./WhatsAppFab";

export default function SiteShell({ children }: { children: ReactNode }) {
  return (
    <>
      <PromoBar />
      <Header />
      <main id="main" tabIndex={-1} style={{ outline: "none" }}>{children}</main>
      <Footer />
      <WhatsAppFab />
    </>
  );
}
