import CustomSignIn from '@/components/auth/custom-sign-in';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In - Gloria System',
  description: 'Sign in to your Gloria System account to manage government workflows',
};

export default function SignInPage() {
  return <CustomSignIn />;
}