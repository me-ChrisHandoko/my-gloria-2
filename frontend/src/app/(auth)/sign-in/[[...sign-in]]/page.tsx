import CustomSignIn from "@/components/auth/custom-sign-in";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In - Gloria System",
  description: "Sign in to your YPK Gloria account",
};

export default function SignInPage() {
  return <CustomSignIn />;
}
