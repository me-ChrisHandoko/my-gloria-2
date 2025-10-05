import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import { StoreProvider } from "@/components/providers/StoreProvider";
import { ClerkApiProvider } from "@/components/providers/ClerkApiProvider";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "YPK Gloria System ",
  description: "Integrated Workflow and Document Management System",
  keywords: "workflow, document management, gloria system",
  authors: [{ name: "Gloria Team" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3B82F6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: undefined,
        variables: {
          colorPrimary: "#3B82F6",
          colorBackground: "#FFFFFF",
          colorText: "#1F2937",
          colorInputBackground: "#F9FAFB",
          colorInputText: "#1F2937",
          borderRadius: "0.5rem",
          fontFamily: "var(--font-geist-sans)",
        },
        elements: {
          formButtonPrimary:
            "bg-blue-500 hover:bg-blue-600 text-white transition-colors duration-200",
          card: "shadow-xl",
          headerTitle: "text-2xl font-bold text-gray-900",
          headerSubtitle: "text-gray-600",
          socialButtonsBlockButton:
            "border-gray-300 hover:bg-gray-50 transition-colors duration-200",
          formFieldLabel: "text-gray-700 font-medium",
          formFieldInput:
            "border-gray-300 focus:border-blue-500 focus:ring-blue-500",
          footerActionLink: "text-blue-500 hover:text-blue-600",
        },
      }}
      localization={{
        signIn: {
          start: {
            title: "Welcome to Gloria System",
            subtitle: "Sign in",
          },
        },
        signUp: {
          start: {
            title: "Create your YPK Gloria account",
            subtitle: "",
          },
        },
      }}
    >
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <StoreProvider>
            <ClerkApiProvider>
              {children}
              <Toaster
                position="top-right"
                theme="light"
                richColors
                closeButton
                duration={4000}
                expand={false}
                visibleToasts={5}
                gap={12}
                offset="1rem"
                dir="ltr"
                toastOptions={{
                  className: "font-sans",
                  style: {
                    borderRadius: "0.5rem",
                    boxShadow:
                      "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
                  },
                  closeButtonAriaLabel: "Close notification",
                }}
                containerAriaLabel="Notifications"
              />
            </ClerkApiProvider>
          </StoreProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
