import Sidebar from '@/components/ui/Sidebar'
import Header from '@/components/ui/Header'
import PageTransition from '@/components/ui/PageTransition'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F5F0E8' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header />
        <main style={{ flex: 1, padding: '36px', overflowY: 'auto' }}>
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  )
}
