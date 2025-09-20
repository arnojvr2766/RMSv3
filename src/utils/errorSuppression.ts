// Suppress Chrome extension errors that don't affect application functionality
export const suppressChromeExtensionErrors = () => {
  const originalError = console.error;
  
  console.error = (...args: any[]) => {
    const errorMessage = args.join(' ');
    
    // Suppress Chrome extension file not found errors
    if (errorMessage.includes('chrome-extension://') && 
        errorMessage.includes('net::ERR_FILE_NOT_FOUND')) {
      return; // Don't log these errors
    }
    
    // Log all other errors normally
    originalError.apply(console, args);
  };
};

// Call this in your main.tsx or App.tsx if you want to suppress these errors
// suppressChromeExtensionErrors();
