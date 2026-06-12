'use client';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProfile, HANDLE_PATTERN, HANDLE_RULES } from '@/lib/use-profile';

interface EditHandleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditHandleDialog({ open, onOpenChange }: EditHandleDialogProps) {
  const { handle, updateHandle } = useProfile();
  const [value, setValue] = useState('');

  useEffect(() => {
    if (open) {
      setValue(handle ?? '');
      updateHandle.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const trimmed = value.trim();
  const isValid = HANDLE_PATTERN.test(trimmed);

  function save() {
    if (!isValid || updateHandle.isPending) return;
    updateHandle.mutate(trimmed, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Change handle</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="space-y-3"
        >
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value.slice(0, 24))}
            placeholder="Shark #0421"
            autoFocus
          />
          <p className="text-xs text-muted-foreground">{HANDLE_RULES}</p>
          {trimmed && !isValid && (
            <p className="text-xs text-destructive">That handle isn&apos;t allowed.</p>
          )}
          {updateHandle.error && (
            <p className="text-xs text-destructive">{updateHandle.error.message}</p>
          )}
          <Button type="submit" className="w-full" disabled={!isValid || updateHandle.isPending}>
            {updateHandle.isPending ? 'Saving…' : 'Save'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}