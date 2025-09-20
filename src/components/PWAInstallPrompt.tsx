import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import Button from './ui/Button';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Clear the deferredPrompt so it can only be used once
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
  };

  if (!showInstallPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-gray-800 border border-gray-600 rounded-lg p-4 shadow-lg z-50 md:left-auto md:right-4 md:w-80">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <img 
            src="/RentDesk.png" 
            alt="RentDesk Logo" 
            className="w-8 h-8 rounded"
          />
          <div>
            <h3 className="text-white font-semibold text-sm">Install RentDesk</h3>
            <p className="text-gray-400 text-xs">
              Install this app on your device for quick access
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="text-gray-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="flex space-x-2 mt-3">
        <Button
          variant="primary"
          size="sm"
          onClick={handleInstallClick}
          className="flex-1"
        >
          <Download className="w-4 h-4 mr-2" />
          Install
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
        >
          Not now
        </Button>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
