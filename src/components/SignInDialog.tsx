'use client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { signInWithProvider } from '@/lib/use-auth';

// Google's multicolor "G" mark, inlined so the button needs no asset or network
// request. Sized to match the button text.
function GoogleLogo() {
  return (
    <svg viewBox="0 0 18 18" className="h-[18px] w-[18px]" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

interface SignInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message?: string;
}

export default function SignInDialog({
  open,
  onOpenChange,
  message = 'Sign in to save favorite rooms and buildings across your devices.',
}: SignInDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Sign in</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            onClick={() => signInWithProvider('google')}
            className="gap-2"
          >
            <GoogleLogo />
            Continue with Google
          </Button>
          {/* Apple sign-in disabled until an Apple Developer account is set up:
              <Button variant="outline" onClick={() => signInWithProvider('apple')}>
                Continue with Apple
              </Button> */}
        </div>
      </DialogContent>
    </Dialog>
  );
}
