import "./globals.css";
import { TransactionProvider } from "@/context/TransactionContext";
import { WalletProvider } from "@/context/WalletContext";
import ToastNotifications from "@/components/ToastNotifications";

export const metadata = {
  title: "Carbon Passport Platform — Hedera",
  description: "Corporate carbon compliance on Hedera Hashgraph. Emissions tracking, carbon passport NFTs, cap-and-trade, and verifiable credentials.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>
          <TransactionProvider>
            {children}
            <ToastNotifications />
          </TransactionProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
