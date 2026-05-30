declare module 'speakeasy';
declare module 'qrcode';

// Allow generic any for some imported server modules without types
declare module '@tanstack/react-start' {
  interface Register {}
}
