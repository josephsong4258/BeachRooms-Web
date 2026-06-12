'use client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { signInWithProvider } from '@/lib/use-auth';

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
          <Button variant="outline" onClick={() => signInWithProvider('google')}>
            Continue with Google
          </Button>
          <Button variant="outline" onClick={() => signInWithProvider('apple')}>
            Continue with Apple
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
