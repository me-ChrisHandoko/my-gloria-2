"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Bell,
  ChevronsUpDown,
  LogOut,
  Settings,
  User,
  Moon,
  Sun,
  Monitor,
  Check,
  Loader2,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

// Theme and Language types
type Theme = "light" | "dark" | "system";
type Language = "en" | "id" | "ms" | "zh" | "ja";

interface LanguageOption {
  value: Language;
  label: string;
  flag: string;
}

interface UserSettings {
  theme: Theme;
  language: Language;
}

const languages: LanguageOption[] = [
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
  { value: "ms", label: "Bahasa Melayu", flag: "🇲🇾" },
  { value: "zh", label: "中文", flag: "🇨🇳" },
  { value: "ja", label: "日本語", flag: "🇯🇵" },
];

// Theme preview component
const ThemePreview = ({ theme }: { theme: Theme }) => {
  const resolvedTheme =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;

  return (
    <div className="mt-3 rounded-lg border overflow-hidden">
      <div
        className={cn(
          "p-4 space-y-3 transition-colors duration-200",
          resolvedTheme === "dark"
            ? "bg-slate-950 text-slate-100"
            : "bg-white text-slate-900"
        )}
      >
        {/* Mini app bar */}
        <div
          className={cn(
            "rounded-md px-3 py-2 flex items-center justify-between",
            resolvedTheme === "dark" ? "bg-slate-900" : "bg-slate-100"
          )}
        >
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                resolvedTheme === "dark" ? "bg-slate-600" : "bg-slate-400"
              )}
            />
            <span className="text-xs font-medium">Preview</span>
          </div>
          <div className="flex gap-1">
            <div
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                resolvedTheme === "dark" ? "bg-slate-600" : "bg-slate-400"
              )}
            />
            <div
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                resolvedTheme === "dark" ? "bg-slate-600" : "bg-slate-400"
              )}
            />
          </div>
        </div>

        {/* Content preview */}
        <div className="space-y-2">
          <div
            className={cn(
              "h-2 rounded",
              resolvedTheme === "dark" ? "bg-slate-800" : "bg-slate-200"
            )}
            style={{ width: "75%" }}
          />
          <div
            className={cn(
              "h-2 rounded",
              resolvedTheme === "dark" ? "bg-slate-800" : "bg-slate-200"
            )}
            style={{ width: "100%" }}
          />
          <div
            className={cn(
              "h-2 rounded",
              resolvedTheme === "dark" ? "bg-slate-800" : "bg-slate-200"
            )}
            style={{ width: "60%" }}
          />
        </div>

        {/* Button preview */}
        <div className="flex gap-2 mt-3">
          <div
            className={cn(
              "px-3 py-1.5 rounded-md text-xs",
              resolvedTheme === "dark"
                ? "bg-blue-600 text-white"
                : "bg-blue-500 text-white"
            )}
          >
            Primary
          </div>
          <div
            className={cn(
              "px-3 py-1.5 rounded-md text-xs border",
              resolvedTheme === "dark"
                ? "border-slate-700 text-slate-300"
                : "border-slate-300 text-slate-700"
            )}
          >
            Secondary
          </div>
        </div>
      </div>
    </div>
  );
};

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const { signOut } = useAuth();

  // Dialog state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Current applied settings
  const [currentSettings, setCurrentSettings] = useState<UserSettings>({
    theme: "system",
    language: "en",
  });

  // Pending settings (not yet saved)
  const [pendingSettings, setPendingSettings] = useState<UserSettings>({
    theme: "system",
    language: "en",
  });

  // Check if there are unsaved changes
  const hasChanges =
    pendingSettings.theme !== currentSettings.theme ||
    pendingSettings.language !== currentSettings.language;

  // Load saved preferences on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("gloria-theme") as Theme;
    const savedLanguage = localStorage.getItem("gloria-language") as Language;

    const initialSettings: UserSettings = {
      theme: savedTheme || "system",
      language: savedLanguage || "en",
    };

    setCurrentSettings(initialSettings);
    setPendingSettings(initialSettings);

    // Apply the saved theme
    if (savedTheme) {
      applyTheme(savedTheme);
    }
  }, []);

  // Apply theme to document
  const applyTheme = useCallback((theme: Theme) => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, []);

  // Apply language (placeholder for i18n integration)
  const applyLanguage = useCallback((language: Language) => {
    // In production, this would trigger i18n language change
    // For example: i18n.changeLanguage(language)
    document.documentElement.setAttribute("lang", language);
  }, []);

  // Handle opening settings dialog
  const handleOpenSettings = useCallback(() => {
    // Reset pending settings to current when opening
    setPendingSettings(currentSettings);
    setSaveSuccess(false);
    setSettingsOpen(true);
  }, [currentSettings]);

  // Handle closing settings dialog
  const handleCloseSettings = useCallback(() => {
    // Reset pending changes if not saved
    setPendingSettings(currentSettings);
    setSaveSuccess(false);
    setSettingsOpen(false);
  }, [currentSettings]);

  // Handle saving settings
  const handleSaveSettings = useCallback(async () => {
    setIsSaving(true);

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Save to localStorage
      localStorage.setItem("gloria-theme", pendingSettings.theme);
      localStorage.setItem("gloria-language", pendingSettings.language);

      // Apply the changes
      applyTheme(pendingSettings.theme);
      applyLanguage(pendingSettings.language);

      // Update current settings
      setCurrentSettings(pendingSettings);

      // Show success state
      setSaveSuccess(true);

      // Close dialog after showing success
      setTimeout(() => {
        setSettingsOpen(false);
        setSaveSuccess(false);
      }, 1000);
    } catch (error) {
      console.error("Failed to save settings:", error);
      // In production, show error toast or notification
    } finally {
      setIsSaving(false);
    }
  }, [pendingSettings, applyTheme, applyLanguage]);

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/sign-in");
    } catch (error) {
      console.error("Sign out failed:", error);
      // In production, show error notification
    }
  };

  // Get current language label
  const getCurrentLanguageLabel = () => {
    const lang = languages.find((l) => l.value === pendingSettings.language);
    return lang ? `${lang.flag} ${lang.label}` : "";
  };

  // Get current theme label
  const getThemeLabel = (theme: Theme) => {
    switch (theme) {
      case "light":
        return "Light";
      case "dark":
        return "Dark";
      case "system":
        return "System";
      default:
        return "";
    }
  };

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onSelect={() => router.push("/dashboard/settings/profile")}
                >
                  <User className="mr-2 h-4 w-4" />
                  Manage Account
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleOpenSettings}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => router.push("/dashboard/notifications")}
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Notifications
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={handleSignOut}
                className="text-red-600 dark:text-red-400"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Customize your application preferences. Changes will be applied
              after clicking Save.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {/* Language Selection */}
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={pendingSettings.language}
                onValueChange={(value: Language) =>
                  setPendingSettings((prev) => ({ ...prev, language: value }))
                }
                disabled={isSaving}
              >
                <SelectTrigger id="language" className="w-full">
                  <SelectValue placeholder="Select a language">
                    {getCurrentLanguageLabel()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="w-full">
                  {languages.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      <div className="flex items-center gap-2">
                        <span className="text-base">{lang.flag}</span>
                        <span>{lang.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Theme Selection with Preview */}
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select
                value={pendingSettings.theme}
                onValueChange={(value: Theme) =>
                  setPendingSettings((prev) => ({ ...prev, theme: value }))
                }
                disabled={isSaving}
              >
                <SelectTrigger id="theme" className="w-full">
                  <SelectValue placeholder="Select a theme">
                    <div className="flex items-center gap-2">
                      {pendingSettings.theme === "light" && (
                        <Sun className="h-4 w-4" />
                      )}
                      {pendingSettings.theme === "dark" && (
                        <Moon className="h-4 w-4" />
                      )}
                      {pendingSettings.theme === "system" && (
                        <Monitor className="h-4 w-4" />
                      )}
                      <span>{getThemeLabel(pendingSettings.theme)}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="w-full">
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      <span>Light</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      <span>Dark</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      <span>System</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Theme Preview */}
              <ThemePreview theme={pendingSettings.theme} />
            </div>

            {/* Changes indicator */}
            {hasChanges && !saveSuccess && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-500" />
                You have unsaved changes
              </div>
            )}

            {/* Success message */}
            {saveSuccess && (
              <div className="text-sm text-green-600 flex items-center gap-2">
                <Check className="h-4 w-4" />
                Settings saved successfully
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseSettings}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSettings}
              disabled={isSaving || !hasChanges || saveSuccess}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saveSuccess ? "Saved" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
