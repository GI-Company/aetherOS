import { Input } from "@/components/ui/input";
import { Globe, RefreshCw, ArrowLeft, ArrowRight, Home } from "lucide-react";

export default function BrowserApp() {
  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-shrink-0 p-2 border-b flex items-center gap-2 bg-card">
        <button className="p-1 rounded-full hover:bg-muted disabled:opacity-50" disabled><ArrowLeft className="h-4 w-4" /></button>
        <button className="p-1 rounded-full hover:bg-muted disabled:opacity-50" disabled><ArrowRight className="h-4 w-4" /></button>
        <button className="p-1 rounded-full hover:bg-muted disabled:opacity-50" disabled><RefreshCw className="h-4 w-4" /></button>
        <button className="p-1 rounded-full hover:bg-muted"><Home className="h-4 w-4" /></button>
        <div className="relative flex-grow">
          <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            defaultValue="https://aether-os.dev/welcome"
            className="pl-9 bg-background"
            disabled
          />
        </div>
      </div>
      <div className="flex-grow bg-background flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Globe className="h-16 w-16 mx-auto mb-4"/>
          <p>Browser content would be displayed here.</p>
          <p className="text-sm">For security reasons, live web browsing is disabled in this environment.</p>
        </div>
      </div>
    </div>
  );
}
