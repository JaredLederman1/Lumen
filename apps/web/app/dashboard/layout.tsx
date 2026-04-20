import Sidebar from '@/components/ui/Sidebar'
import Header from '@/components/ui/Header'
import MobileNav from '@/components/ui/MobileNav'
import PageTransition from '@/components/ui/PageTransition'
import GlobalTooltipRenderer from '@/components/ui/GlobalTooltipRenderer'
import CoachWidget from '@/components/ui/CoachWidget'
import { DashboardProvider } from '@/lib/dashboardData'
import { TooltipProvider } from '@/lib/tooltipContext'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <TooltipProvider>
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>

          {/* Desktop sidebar, hidden on mobile via CSS */}
          <div className="desktop-sidebar">
            <Sidebar />
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <Header />
            <main
              className="dashboard-main"
              style={{ flex: 1, overflowY: 'auto' }}
            >
              <PageTransition>{children}</PageTransition>
            </main>

          </div>
        </div>

        {/* Mobile bottom nav, fixed at bottom, hidden on desktop via CSS */}
        <div
          className="mobile-nav"
          style={{ position: 'fixed', bottom: 0, left: 0, right: 0, width: '100%', zIndex: 90 }}
        >
          <MobileNav />
        </div>
        <GlobalTooltipRenderer />
        <CoachWidget />
      </TooltipProvider>
    </DashboardProvider>
  )
}
