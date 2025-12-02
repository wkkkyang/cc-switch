import { useEffect, useState } from "react";
import { ExternalLink, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getVersion } from "@tauri-apps/api/app";
import { settingsApi } from "@/lib/api";

interface AboutSectionProps {
  isPortable: boolean;
}

export function AboutSection({ isPortable }: AboutSectionProps) {
  const { t } = useTranslation();
  const [version, setVersion] = useState<string | null>(null);
  const [isLoadingVersion, setIsLoadingVersion] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const loaded = await getVersion();
        if (active) {
          setVersion(loaded);
        }
      } catch (error) {
        console.error("[AboutSection] Failed to get version", error);
        if (active) {
          setVersion(null);
        }
      } finally {
        if (active) {
          setIsLoadingVersion(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const handleOpenReleaseNotes = async () => {
    try {
      const targetVersion = version ?? "";
      const displayVersion = targetVersion.startsWith("v")
        ? targetVersion
        : targetVersion
          ? `v${targetVersion}`
          : "";

      if (!displayVersion) {
        await settingsApi.openExternal(
          "https://github.com/farion1231/cc-switch/releases",
        );
        return;
      }

      await settingsApi.openExternal(
        `https://github.com/farion1231/cc-switch/releases/tag/${displayVersion}`,
      );
    } catch (error) {
      console.error("[AboutSection] Failed to open release notes", error);
      toast.error(t("settings.openReleaseNotesFailed"));
    }
  };

  const displayVersion = version ?? t("common.unknown");

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h3 className="text-sm font-medium">{t("common.about")}</h3>
        <p className="text-xs text-muted-foreground">
          {t("settings.aboutHint")}
        </p>
      </header>

      <div className="space-y-4 rounded-lg border border-border-default p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">CC Switch</p>
            <p className="text-xs text-muted-foreground">
              {t("common.version")}{" "}
              {isLoadingVersion ? (
                <Loader2 className="inline h-3 w-3 animate-spin" />
              ) : (
                `v${displayVersion}`
              )}
            </p>
            {isPortable ? (
              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Info className="h-3 w-3" />
                {t("settings.portableMode")}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenReleaseNotes}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              {t("settings.releaseNotes")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
