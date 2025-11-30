// src/app/layout.tsx
import "./globals.css";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { Toaster } from "@/components/ui/toaster";
import RootClientWrapper from "@/clients/RootClientWrapper";

export const metadata = {
  title: "FriendsNavigator",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <RootClientWrapper>
          <FirebaseClientProvider>
            {children}
          </FirebaseClientProvider>
          <Toaster />
        </RootClientWrapper>
      </body>
    </html>
  );
}
