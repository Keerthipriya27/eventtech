declare module '@tanstack/react-start' {
  export function createServerFn(opts?: any): any;
  export function createMiddleware(opts?: any): any;
  export function useServerFn(fn?: any): any;
  export function createStart(opts?: any): any;
  export function createFileRoute(path?: string): any;
  export function useServerEffect(...args: any[]): any;
}
