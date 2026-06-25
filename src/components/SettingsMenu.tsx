'use client';
import { useState } from 'react';
import { Settings, HelpCircle, LogOut, Pencil, ChevronDown } from 'lucide-react';
import EditHandleDialog from '@/components/EditHandleDialog';
import DeleteAccountDialog from '@/components/DeleteAccountDialog';
import { Button } from '@/components/ui/button';
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
        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" aria-label="Settings">
          <Settings className="h-3.5 w-3.5" />
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
        {!isMobile && (
          <SettingRow
            label="Auto-center building"
            help="When you open a building from the list, the map automatically centers on it."
            checked={settings.autoCenter}
            onCheckedChange={(v) => onChange({ autoCenter: v })}
          />
        )}
        <div className="border-t pt-3">
          <button
            type="button"
            onClick={() => setShowEtiquette((v) => !v)}
            aria-expanded={showEtiquette}
            className="flex w-full items-center justify-between gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
          >
            Usage &amp; Etiquette
            <ChevronDown
              className={`h-4 w-4 shrink-0 transition-transform ${showEtiquette ? 'rotate-180' : ''}`}
            />
          </button>
          {showEtiquette && (
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs text-muted-foreground">
              {ETIQUETTE.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </div>
        {user ? (
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setShowEditHandle(true)}
                aria-label="Change handle"
                className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="truncate">{handle ?? 'Signed in'}</span>
                <Pencil className="h-3 w-3 shrink-0" />
              </button>
              <button
                onClick={() => signOut()}
                className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
            <button
              onClick={() => setShowDeleteAccount(true)}
              className="text-xs text-muted-foreground transition-colors hover:text-destructive"
            >
              Delete account
            </button>
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
    <EditHandleDialog open={showEditHandle} onOpenChange={setShowEditHandle} />
    <DeleteAccountDialog open={showDeleteAccount} onOpenChange={setShowDeleteAccount} />
    </>
  );
}
