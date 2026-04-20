/** Returns true only if the string looks like a valid email address. */
export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
};

export const EMAIL_ERROR = 'Please enter a valid email address (e.g. name@example.com)';
