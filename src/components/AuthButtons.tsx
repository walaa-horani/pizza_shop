'use client';

import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

export default function AuthButtons() {
  return (
    <>
      <SignedOut>
        <div className="flex items-center gap-3">
          <SignInButton>
            <button className="font-label text-sm uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">
              Sign in
            </button>
          </SignInButton>
          <SignUpButton>
            <button className="font-label text-sm uppercase tracking-widest bg-primary text-on-primary px-4 py-2 rounded-xl">
              Sign up
            </button>
          </SignUpButton>
        </div>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </>
  );
}
