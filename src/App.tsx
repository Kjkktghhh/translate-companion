import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, NavLink } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LayoutDashboard, Layers, BookOpen, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import Dashboard from "./pages/Dashboard";
import NewBatch from "./pages/NewBatch";
import BatchDetail from "./pages/BatchDetail";
import Glossaries from "./pages/Glossaries";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/batches/new', icon: Layers, label: 'New Batch' },
  { to: '/glossaries', icon: BookOpen, label: 'Glossaries' },
];

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <aside className="w-56 flex-shrink-0 flex flex-col border-r border-border/50 bg-sidebar">
            {/* Logo */}
            <div className="px-5 py-6 border-b border-border/50">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                  <Zap size={14} className="text-primary-foreground" />
                </div>
                <div>
                  <div className="font-display text-sm text-foreground leading-none">K-Translate</div>
                  <div className="font-mono text-[10px] text-muted-foreground leading-none mt-0.5">Pro</div>
                </div>
              </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-0.5">
              {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-primary/15 text-primary border border-primary/20'
                      : 'text-sidebar-foreground hover:text-foreground hover:bg-secondary/50'
                  )}
                >
                  <Icon size={16} />
                  {label}
                </NavLink>
              ))}
            </nav>

            {/* Footer */}
            <div className="px-4 py-4 border-t border-border/50">
              <div className="text-[11px] text-muted-foreground font-mono">v1.0.0-mvp</div>
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 overflow-auto bg-background">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/batches/new" element={<NewBatch />} />
              <Route path="/batches/:id" element={<BatchDetail />} />
              <Route path="/glossaries" element={<Glossaries />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
