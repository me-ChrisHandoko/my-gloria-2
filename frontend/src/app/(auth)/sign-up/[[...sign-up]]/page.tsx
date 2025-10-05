import { SignUp } from "@clerk/nextjs";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up - Gloria System",
  description: "Create your YPK Gloria account",
};

export default function SignUpPage() {
  return (
    <div className="w-full">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Create Your Account
        </h1>
        <p className="text-gray-600">Join YPK Gloria System</p>
      </div>

      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-white shadow-xl rounded-xl border border-gray-100",
            headerTitle: "hidden",
            headerSubtitle: "hidden",
            socialButtonsBlockButton:
              "border border-gray-300 hover:bg-gray-50 transition-all duration-200",
            socialButtonsBlockButtonText: "font-medium",
            dividerLine: "bg-gray-200",
            dividerText: "text-gray-500 text-sm",
            formFieldLabel: "text-gray-700 font-medium text-sm mb-1",
            formFieldInput:
              "rounded-lg border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200",
            formFieldInputShowPasswordButton:
              "text-gray-500 hover:text-gray-700",
            formButtonPrimary:
              "bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md",
            footerActionLink:
              "text-blue-500 hover:text-blue-600 font-medium transition-colors duration-200",
            footerActionText: "text-gray-600",
            identityPreviewText: "text-gray-700",
            identityPreviewEditButton: "text-blue-500 hover:text-blue-600",
            formFieldSuccessText: "text-green-600 text-sm",
            formFieldErrorText: "text-red-600 text-sm",
            formFieldHintText: "text-gray-500 text-sm",
            otpCodeFieldInput: "border-gray-300 focus:border-blue-500",
            formResendCodeLink: "text-blue-500 hover:text-blue-600",
          },
          layout: {
            socialButtonsPlacement: "top",
            socialButtonsVariant: "blockButton",
            showOptionalFields: true,
            privacyPageUrl: "/privacy",
            termsPageUrl: "/terms",
          },
        }}
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
        forceRedirectUrl="/dashboard"
        unsafeMetadata={{
          role: "USER",
          department: "",
          position: "",
        }}
      />

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          By creating an account, you agree to our{" "}
          <a
            href="/terms"
            className="text-blue-500 hover:text-blue-600 transition-colors"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="/privacy"
            className="text-blue-500 hover:text-blue-600 transition-colors"
          >
            Privacy Policy
          </a>
        </p>
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Your account will need to be approved by an
          administrator before you can access all features of Gloria System.
        </p>
      </div>
    </div>
  );
}
