import {
  ClerkProvider,
  RedirectToSignIn,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <header style={{ padding: "20px" }}>
            <SignedIn>
              <UserButton />
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn />
            </SignedOut>
          </header>
          <main>{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
