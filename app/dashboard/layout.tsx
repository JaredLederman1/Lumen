import Sidebar from '@/components/ui/Sidebar'
import Header from '@/components/ui/Header'
import PageTransition from '@/components/ui/PageTransition'
import GlobalTooltipRenderer from '@/components/ui/GlobalTooltipRenderer'
import { DashboardProvider } from '@/lib/dashboardData'
import { TooltipProvider } from '@/lib/tooltipContext'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <TooltipProvider>
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#080B0F' }}>
          <Sidebar />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <Header />
            <main style={{ flex: 1, padding: '36px', overflowY: 'auto' }}>
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
        </div>
        <GlobalTooltipRenderer />
      </TooltipProvider>
    </DashboardProvider>
  )
}
