// Root layout — locale-specific layout in [locale]/layout.tsx handles the full HTML structure.
// This minimal wrapper is required by Next.js App Router.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
