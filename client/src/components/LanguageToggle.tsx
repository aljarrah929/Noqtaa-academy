import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

interface LanguageToggleProps {
  variant?: "ghost" | "outline" | "default";
  className?: string;
}

export function LanguageToggle({ variant = "ghost", className = "" }: LanguageToggleProps) {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith("ar") ? "ar" : "en";

  const switchLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size="icon"
          className={className}
          data-testid="button-language-toggle"
        >
          <Globe className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => switchLanguage("en")}
          className={currentLang === "en" ? "bg-accent" : ""}
          data-testid="button-lang-en"
        >
          <span className="ltr:mr-2 rtl:ml-2">EN</span>
          English
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => switchLanguage("ar")}
          className={currentLang === "ar" ? "bg-accent" : ""}
          data-testid="button-lang-ar"
        >
          <span className="ltr:mr-2 rtl:ml-2">AR</span>
          العربية
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
