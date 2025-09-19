"use client";

import { useState, useCallback, useEffect } from "react";
import { useSignIn, useAuth, useClerk } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import {
  validateUserWithBackend,
  storeUserSession,
  clearUserSession,
} from "@/lib/auth";
import { oauthLogger, formatOAuthError } from "@/lib/oauth-logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OTPInput } from "@/components/ui/otp-input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";

// Icons
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const MicrosoftIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#F25022" d="M11.4 11.4H1V1h10.4v10.4z" />
    <path fill="#7FBA00" d="M23 11.4H12.6V1H23v10.4z" />
    <path fill="#00A4EF" d="M11.4 23H1V12.6h10.4V23z" />
    <path fill="#FFB900" d="M23 23H12.6V12.6H23V23z" />
  </svg>
);

// Types
type AuthStep = "email" | "otp" | "password";

// Validation schemas
const emailSchema = z
  .string()
  .min(1, "Email is required")
  .refine(
    (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    "Please enter a valid email address"
  );
const otpSchema = z
  .string()
  .length(6, "OTP must be 6 digits")
  .regex(/^\d+$/, "OTP must contain only numbers");
const passwordSchema = z.string().min(1, "Password is required");

export default function CustomSignIn() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams?.get("redirect_url") || "/dashboard";

  // Check for error parameters from redirects
  const urlError = searchParams?.get("error");
  const urlSource = searchParams?.get("source");

  // State management
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [emailAddressId, setEmailAddressId] = useState<string | null>(null);
  const [step, setStep] = useState<AuthStep>("email");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false); // Navigation guard state

  // For development mode indicator
  const isDevelopment = process.env.NODE_ENV === "development";

  // Handle error parameters from URL
  useEffect(() => {
    if (urlError && urlSource) {
      // Get the actual backend error message from sessionStorage
      const storedErrorMessage = sessionStorage.getItem('gloria_error_message');

      // Always use the backend error message if available, otherwise use a generic fallback
      const errorMessage = storedErrorMessage ||
        "Access validation failed. Please try again or contact support.";

      // Clear the stored message after retrieving
      if (storedErrorMessage) {
        sessionStorage.removeItem('gloria_error_message');
      }

      setError(errorMessage);

      // Clear the error params from URL after displaying
      const newParams = new URLSearchParams(searchParams?.toString());
      newParams.delete("error");
      newParams.delete("source");
      const newUrl = `${window.location.pathname}${
        newParams.toString() ? `?${newParams.toString()}` : ""
      }`;
      window.history.replaceState({}, "", newUrl);
    }
  }, [urlError, urlSource, searchParams]);

  // Resend OTP timer
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Reset error when step changes
  useEffect(() => {
    setError("");
    setFieldErrors({});
  }, [step]);

  // Validate form fields
  const validateField = useCallback(
    (field: string, value: string): string | null => {
      try {
        switch (field) {
          case "email":
            emailSchema.parse(value);
            return null;
          case "otp":
            otpSchema.parse(value);
            return null;
          case "password":
            passwordSchema.parse(value);
            return null;
          default:
            return null;
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          return error.issues[0].message;
        }
        return "Invalid input";
      }
    },
    []
  );

  // Backend validation with proper cleanup on failure
  const validateWithBackend = useCallback(
    async (clerkToken: string): Promise<boolean> => {
      try {
        const response = await validateUserWithBackend(clerkToken);
        storeUserSession(response);
        return true;
      } catch (error: any) {
        // Use actual backend error message for display
        // The backend already sends appropriate messages based on the error type
        const errorMessage =
          error.message ||
          "Access validation failed. Please try again or contact support.";

        setError(errorMessage);

        try {
          await signOut();
        } catch (signOutError) {
          console.error("Failed to sign out:", signOutError);
        }

        clearUserSession();
        return false;
      }
    },
    [signOut]
  );

  // Email submission
  const handleEmailSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      const emailError = validateField("email", email);
      if (emailError) {
        setFieldErrors({ email: emailError });
        return;
      }

      setIsLoading(true);
      setError("");
      setFieldErrors({});

      try {
        if (!signIn) throw new Error("Authentication not initialized");

        const signInAttempt = await signIn.create({
          identifier: email.toLowerCase().trim(),
        });

        const { supportedFirstFactors } = signInAttempt;

        if (
          supportedFirstFactors?.some(
            (factor) => factor.strategy === "email_code"
          )
        ) {
          const emailFactor = supportedFirstFactors.find((f) => f.strategy === "email_code");
          const factorEmailAddressId = emailFactor?.emailAddressId;

          if (!factorEmailAddressId) {
            throw new Error("Email verification not available for this account");
          }

          await signIn.prepareFirstFactor({
            strategy: "email_code",
            emailAddressId: factorEmailAddressId,
          });

          // Store emailAddressId for resend functionality
          setEmailAddressId(factorEmailAddressId);
          setStep("otp");
          setResendTimer(60);
        } else if (
          supportedFirstFactors?.some(
            (factor) => factor.strategy === "password"
          )
        ) {
          setStep("password");
        } else {
          throw new Error("No authentication method available for this email");
        }
      } catch (error: any) {
        console.error("Email submission error:", error);
        if (error.errors?.[0]?.message) {
          setError(error.errors[0].message);
        } else if (error.message) {
          setError(error.message);
        } else {
          setError("Unable to process your email. Please try again.");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [email, signIn, validateField]
  );

  // OTP verification
  const handleOtpSubmit = useCallback(
    async (e?: React.FormEvent | string) => {
      // If called with a string (from onComplete), use that value
      // Otherwise, it's a form event, so prevent default and use state
      const otpValue = typeof e === 'string' ? e : otp;

      if (typeof e !== 'string') {
        e?.preventDefault();
      }

      const otpError = validateField("otp", otpValue);
      if (otpError) {
        setFieldErrors({ otp: otpError });
        return;
      }

      setIsLoading(true);
      setError("");
      setFieldErrors({});

      try {
        if (!signIn) throw new Error("Authentication not initialized");

        const signInAttempt = await signIn.attemptFirstFactor({
          strategy: "email_code",
          code: otpValue,
        });

        if (signInAttempt.status === "complete") {
          await setActive({ session: signInAttempt.createdSessionId! });

          const token = await getToken();
          if (!token) {
            throw new Error("Failed to get authentication token");
          }

          const isValid = await validateWithBackend(token);

          if (isValid) {
            // Set navigation guard to prevent race conditions
            setIsNavigating(true);
            setIsLoading(false);

            // Log successful authentication for monitoring
            console.log('[Auth] OTP verification successful, redirecting to:', redirectUrl);

            // Small delay to ensure state synchronization across all auth contexts
            const navigationTimeout = setTimeout(() => {
              try {
                // Use replace to prevent back navigation issues
                router.replace(redirectUrl);
              } catch (navError) {
                console.error('[Auth] Navigation error:', navError);
                // Fallback to hard navigation if router fails
                window.location.href = redirectUrl;
              }
            }, 100);

            // Safety cleanup - if navigation takes too long, reset state
            setTimeout(() => {
              if (isNavigating) {
                console.warn('[Auth] Navigation timeout, resetting state');
                setIsNavigating(false);
                clearTimeout(navigationTimeout);
              }
            }, 5000);
          } else {
            setStep("email");
            setOtp("");
            setEmail("");
            setEmailAddressId(null);
            setIsLoading(false);
          }
        } else {
          throw new Error("Invalid verification code");
        }
      } catch (error: any) {
        console.error("OTP verification error:", error);
        if (error.errors?.[0]?.message) {
          setError(error.errors[0].message);
        } else if (error.message) {
          setError(error.message);
        } else {
          setError("Invalid or expired verification code. Please try again.");
        }
        setIsLoading(false);
      }
    },
    [
      otp,
      signIn,
      validateField,
      validateWithBackend,
      setActive,
      router,
      redirectUrl,
      getToken,
      email,
    ]
  );

  // Password submission
  const handlePasswordSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      const passwordError = validateField("password", password);
      if (passwordError) {
        setFieldErrors({ password: passwordError });
        return;
      }

      setIsLoading(true);
      setError("");
      setFieldErrors({});

      try {
        if (!signIn) throw new Error("Authentication not initialized");

        const signInAttempt = await signIn.attemptFirstFactor({
          strategy: "password",
          password: password,
        });

        if (signInAttempt.status === "complete") {
          await setActive({ session: signInAttempt.createdSessionId! });

          const token = await getToken();
          if (!token) {
            throw new Error("Failed to get authentication token");
          }

          const isValid = await validateWithBackend(token);

          if (isValid) {
            // Set navigation guard to prevent race conditions
            setIsNavigating(true);
            setIsLoading(false);

            // Log successful authentication for monitoring
            console.log('[Auth] Password verification successful, redirecting to:', redirectUrl);

            // Small delay to ensure state synchronization across all auth contexts
            const navigationTimeout = setTimeout(() => {
              try {
                // Use replace to prevent back navigation issues
                router.replace(redirectUrl);
              } catch (navError) {
                console.error('[Auth] Navigation error:', navError);
                // Fallback to hard navigation if router fails
                window.location.href = redirectUrl;
              }
            }, 100);

            // Safety cleanup - if navigation takes too long, reset state
            setTimeout(() => {
              if (isNavigating) {
                console.warn('[Auth] Navigation timeout, resetting state');
                setIsNavigating(false);
                clearTimeout(navigationTimeout);
              }
            }, 5000);
          } else {
            setStep("email");
            setPassword("");
            setEmail("");
            setEmailAddressId(null);
            setIsLoading(false);
          }
        } else {
          throw new Error("Invalid password");
        }
      } catch (error: any) {
        console.error("Password verification error:", error);
        if (error.errors?.[0]?.message) {
          setError(error.errors[0].message);
        } else if (error.message) {
          setError(error.message);
        } else {
          setError("Invalid password. Please try again.");
        }
        setIsLoading(false);
      }
    },
    [
      password,
      signIn,
      validateField,
      validateWithBackend,
      setActive,
      router,
      redirectUrl,
      getToken,
      email,
    ]
  );

  // OAuth handlers
  const handleOAuthSignIn = useCallback(
    async (strategy: "oauth_google" | "oauth_microsoft") => {
      if (!isLoaded || !signIn) {
        const errorMsg = "Authentication service is not ready. Please refresh and try again.";
        oauthLogger.error('OAuth Init', errorMsg, null, { strategy });
        setError(errorMsg);
        return;
      }

      setIsLoading(true);
      setError("");

      const provider = strategy === "oauth_google" ? "Google" : "Microsoft";

      try {
        // Log OAuth initiation
        oauthLogger.info('OAuth Start', `Initiating ${provider} OAuth flow`, {
          strategy,
          redirectUrl
        });

        sessionStorage.setItem("gloria_pending_validation", "true");
        sessionStorage.setItem("gloria_redirect_url", redirectUrl);

        await signIn.authenticateWithRedirect({
          strategy,
          redirectUrl: "/auth/callback",
          redirectUrlComplete: "/auth/validate",
        });

        // Log successful redirect initiation
        oauthLogger.info('OAuth Redirect', `Redirecting to ${provider} for authentication`);
      } catch (error: any) {
        // Enhanced error logging
        if (strategy === "oauth_microsoft") {
          oauthLogger.microsoftOAuth('Authentication Failed', 'Failed to initiate Microsoft OAuth', null, error);
        } else {
          oauthLogger.googleOAuth('Authentication Failed', 'Failed to initiate Google OAuth', null, error);
        }

        // Use the improved error formatter
        const errorMessage = formatOAuthError(error, provider);
        setError(errorMessage);
        setIsLoading(false);
      }
    },
    [isLoaded, signIn, redirectUrl]
  );

  // Resend OTP
  const handleResendOtp = useCallback(async () => {
    if (resendTimer > 0) return;

    setIsLoading(true);
    setError("");

    try {
      if (!signIn) throw new Error("Authentication not initialized");

      // Validate emailAddressId exists
      if (!emailAddressId) {
        throw new Error("Unable to resend code. Please restart the sign-in process.");
      }

      await signIn.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId: emailAddressId,
      });
      setResendTimer(60);
      setError("");
    } catch (error: any) {
      console.error("Resend OTP error:", error);
      setError("Failed to resend verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [email, signIn, resendTimer]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    setStep("email");
    setOtp("");
    setPassword("");
    setError("");
    setFieldErrors({});
    setEmailAddressId(null); // Reset emailAddressId when going back
  }, []);

  // Show loading state while Clerk loads or during navigation
  if (!isLoaded || isNavigating) {
    return (
      <Card className="w-full shadow-lg border-0">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-muted-foreground">
              {isNavigating ? 'Redirecting to dashboard...' : 'Loading authentication...'}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-lg border-0">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl font-bold text-center">
          Welcome back
        </CardTitle>
        <CardDescription className="text-center">
          Sign in to your Gloria System account
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Email Step */}
        {step === "email" && (
          <>
            {/* Social Login Buttons */}
            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={() => handleOAuthSignIn("oauth_google")}
                disabled={isLoading || isNavigating}
                className="w-full"
              >
                <GoogleIcon />
                <span className="ml-2">Continue with Google</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => handleOAuthSignIn("oauth_microsoft")}
                disabled={isLoading || isNavigating}
                className="w-full"
              >
                <MicrosoftIcon />
                <span className="ml-2">Continue with Microsoft</span>
              </Button>
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Email Form */}
            <form onSubmit={handleEmailSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setFieldErrors({});
                    }}
                    onBlur={() => {
                      const error = validateField("email", email);
                      if (error) setFieldErrors({ email: error });
                    }}
                    disabled={isLoading || isNavigating}
                    autoComplete="email"
                    autoFocus
                  />
                  {fieldErrors.email && (
                    <p className="text-sm text-destructive">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !email || isNavigating}
                  className="w-full"
                >
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Continue
                </Button>
              </div>
            </form>
          </>
        )}

        {/* OTP Step */}
        {step === "otp" && (
          <form onSubmit={handleOtpSubmit}>
            <div className="space-y-4">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                className="mb-2 -ml-2"
                size="sm"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to email
              </Button>

              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <p className="text-sm text-muted-foreground">
                  We sent a code to {email}
                </p>
                <div className="flex justify-center">
                  <OTPInput
                    value={otp}
                    onChange={(value) => {
                      setOtp(value);
                      setFieldErrors({});
                    }}
                    onComplete={(value) => {
                      // Auto-submit when all digits are entered
                      if (value.length === 6 && !isNavigating) {
                        handleOtpSubmit(value);
                      }
                    }}
                    disabled={isLoading || isNavigating}
                    autoFocus
                    error={!!fieldErrors.otp || !!error}
                  />
                </div>
                {fieldErrors.otp && (
                  <p className="text-sm text-destructive text-center">{fieldErrors.otp}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading || isNavigating}
                className="w-full"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify
              </Button>

              <Button
                type="button"
                variant="link"
                onClick={handleResendOtp}
                disabled={resendTimer > 0 || isLoading || isNavigating}
                className="w-full"
              >
                {resendTimer > 0
                  ? `Resend code in ${resendTimer}s`
                  : "Resend verification code"}
              </Button>
            </div>
          </form>
        )}

        {/* Password Step */}
        {step === "password" && (
          <form onSubmit={handlePasswordSubmit}>
            <div className="space-y-4">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                className="mb-2 -ml-2"
                size="sm"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Use different email
              </Button>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setFieldErrors({});
                    }}
                    onBlur={() => {
                      const error = validateField("password", password);
                      if (error) setFieldErrors({ password: error });
                    }}
                    disabled={isLoading || isNavigating}
                    autoComplete="current-password"
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {fieldErrors.password && (
                  <p className="text-sm text-destructive">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading || !password || isNavigating}
                className="w-full"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign in
              </Button>

              <Button variant="link" className="w-full" asChild>
                <a href="/forgot-password">Forgot your password?</a>
              </Button>
            </div>
          </form>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              {error.includes("not registered") && (
                <span className="block mt-1">Please contact HR</span>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      {step === "email" && (
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-center text-muted-foreground">
            By signing in, you agree to our{" "}
            <a
              href="/terms"
              className="underline underline-offset-4 hover:text-primary"
            >
              Terms
            </a>{" "}
            and{" "}
            <a
              href="/privacy"
              className="underline underline-offset-4 hover:text-primary"
            >
              Privacy Policy
            </a>
          </div>
          <div className="text-xs text-center text-muted-foreground">
            For access issues, contact your HR department
          </div>
        </CardFooter>
      )}

      {/* Development Mode Indicator */}
      {isDevelopment && (
        <div className="text-center text-orange-500 text-xs pb-4">
          Development mode
        </div>
      )}
    </Card>
  );
}
