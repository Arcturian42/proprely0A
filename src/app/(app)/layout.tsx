import { DataProvider } from '@/components/providers/DataProvider'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <DataProvider>{children}</DataProvider>
}
