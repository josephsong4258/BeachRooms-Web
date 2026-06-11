'use client';
import { Settings, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface AppSettings {
  darkMode: boolean;
  showMap: boolean;
  autoCenter: boolean;
}

interface SettingsMenuProps {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
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
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`What does ${label} do?`}
                className="text-muted-foreground/70 hover:text-muted-foreground"
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px]">
              <p className="text-xs">{help}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
    </div>
  );
}

export default function SettingsMenu({ settings, onChange }: SettingsMenuProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" aria-label="Settings">
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Settings</p>
        <TooltipProvider delayDuration={100}>
          <SettingRow
            label="Dark mode"
            checked={settings.darkMode}
            onCheckedChange={(v) => onChange({ darkMode: v })}
          />
          <SettingRow
            label="Hide map"
            checked={!settings.showMap}
            onCheckedChange={(v) => onChange({ showMap: !v })}
          />
          <SettingRow
            label="Auto-center building"
            help="When you expand a building in the list, the map automatically centers on it."
            checked={settings.autoCenter}
            onCheckedChange={(v) => onChange({ autoCenter: v })}
          />
        </TooltipProvider>
      </PopoverContent>
    </Popover>
  );
}
