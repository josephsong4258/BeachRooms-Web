'use client';
import { useState } from 'react';
import { Settings, HelpCircle, ChevronDown, ChevronRight } from 'lucide-react';
import EditHandleDialog from '@/components/EditHandleDialog';
import DeleteAccountDialog from '@/components/DeleteAccountDialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { useUser, signInWithProvider, signOut } from '@/lib/use-auth';
import { useProfile } from '@/lib/use-profile';
import { GoogleLogo } from '@/components/SignInDialog';
import InfoPopover from '@/components/InfoPopover';

export interface AppSettings {
  showMap: boolean;
  autoCenter: boolean;
  showParking: boolean;
}

interface SettingsMenuProps {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
  isMobile: boolean;
}

function SettingRow({
  label,
  help,
  checked,
  onCheckedChange,
}: {
  label: string;
  help?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-1.5 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {help && (
          <InfoPopover
            trigger={
              <button
                type="button"
                aria-label={`What does ${label} do?`}
                className="text-muted-foreground/70 hover:text-muted-foreground"
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            }
          >
            {help}
          </InfoPopover>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
    </div>
  );
}

const ETIQUETTE = [
  'Availability based on official class times only',
  'Rooms may be booked by clubs or meetings',
  'Hours vary during finals week',
  'Keep the rooms tidy',
  'Maintain a respectful noise level to avoid disrupting nearby classes',
  'Classroom access is a privilege. Rooms may be locked by the school if used improperly',
];

export default function SettingsMenu({ settings, onChange, isMobile }: SettingsMenuProps) {
  const { user } = useUser();
  const { handle } = useProfile();
  const [showEditHandle, setShowEditHandle] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showEtiquette, setShowEtiquette] = useState(false);

  return (
    <>
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" aria-label="Settings">
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Settings</p>
        <SettingRow
          label="Hide map"
          checked={!settings.showMap}
          onCheckedChange={(v) => onChange({ showMap: !v })}
        />
        <SettingRow
          label="Show parking"
          help="Highlights campus parking on the map: green where you can park right now, red where you can't."
          checked={settings.showParking}
          onCheckedChange={(v) => onChange({ showParking: v })}
        />
        <SettingRow
          label="Auto-center building"
          help="When you open a building from the list, the map automatically centers on it."
          checked={settings.autoCenter}
          onCheckedChange={(v) => onChange({ autoCenter: v })}
        />
        <div>
          {/* Mobile: opens a centered dialog (inlining the list overflows the
              popover). Desktop: expands inline, where there's room. */}
          <button
            type="button"
            onClick={() => setShowEtiquette((v) => !v)}
            aria-expanded={isMobile ? undefined : showEtiquette}
            className="flex w-full items-center justify-between gap-2 text-sm font-medium transition-colors hover:text-muted-foreground"
          >
            Usage &amp; Etiquette
            {isMobile ? (
              <ChevronRight className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform ${showEtiquette ? 'rotate-180' : ''}`}
              />
            )}
          </button>
          {!isMobile && showEtiquette && (
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs text-muted-foreground">
              {ETIQUETTE.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </div>
        {user ? (
          <div className="space-y-2 border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Account</p>
            <button
              onClick={() => setShowEditHandle(true)}
              aria-label="Account settings"
              className="flex w-full min-w-0 items-center text-sm font-medium transition-colors hover:text-muted-foreground"
            >
              <span className="truncate">{handle ?? 'Signed in'}</span>
            </button>
            <Button variant="outline" size="sm" onClick={() => signOut()} className="w-full">
              Sign out
            </Button>
          </div>
        ) : (
          <div className="border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => signInWithProvider('google')}
              className="w-full gap-2"
            >
              <GoogleLogo />
              Sign in with Google
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
    <EditHandleDialog
      open={showEditHandle}
      onOpenChange={setShowEditHandle}
      onDeleteAccount={() => setShowDeleteAccount(true)}
    />
    <DeleteAccountDialog open={showDeleteAccount} onOpenChange={setShowDeleteAccount} />
    {/* Mobile: Usage & Etiquette as a centered dialog instead of inline. */}
    <Dialog open={isMobile && showEtiquette} onOpenChange={setShowEtiquette}>
      <DialogContent className="max-w-[90vw] rounded-2xl sm:max-w-sm sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle>Usage &amp; Etiquette</DialogTitle>
        </DialogHeader>
        <ul className="list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
          {ETIQUETTE.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
    </>
  );
}
