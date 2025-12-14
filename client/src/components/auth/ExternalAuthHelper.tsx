import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Check, ExternalLink, Monitor, AlertCircle } from "lucide-react";
import { BRAND_NAME } from "@/lib/branding";

interface ExternalAuthHelperProps {
  onDismiss?: () => void;
}

export function ExternalAuthHelper({ onDismiss }: ExternalAuthHelperProps) {
  const [copied, setCopied] = useState(false);
  
  const getDevUrl = () => {
    const hostname = window.location.hostname;
    if (hostname.includes('.replit.dev')) {
      return window.location.origin;
    }
    const parts = hostname.split('.');
    const replSlug = parts[0];
    return `https://${replSlug}.replit.dev`;
  };
  
  const devUrl = getDevUrl();
  
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(devUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
    }
  };
  
  const handleOpenPreview = () => {
    window.open(devUrl, "_blank");
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle>Login Available in Preview</CardTitle>
          <CardDescription>
            {BRAND_NAME} uses secure authentication that works in the Preview window during development.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Monitor className="w-4 h-4" />
            <AlertDescription>
              To log in, please use the Preview window inside Replit, or open the development URL below.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono truncate">
                {devUrl}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyUrl}
                data-testid="button-copy-url"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            
            <Button 
              className="w-full" 
              onClick={handleOpenPreview}
              data-testid="button-open-preview"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in Preview Window
            </Button>
            
            {onDismiss && (
              <Button 
                variant="ghost" 
                className="w-full" 
                onClick={onDismiss}
                data-testid="button-dismiss-auth-helper"
              >
                Continue Without Logging In
              </Button>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            Once published, login will work from any browser.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
