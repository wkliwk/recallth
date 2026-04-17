// Recallth — supplement tracking SPA
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import { AiUsageProvider } from './context/AiUsageContext'
import AiUsageBadge from './components/AiUsageBadge'
import { useAiUsage } from './context/AiUsageContext'
import WebShell from './components/WebShell'
import Landing from './screens/Landing'
import Auth from './screens/Auth'
import Home from './screens/Home'
import Chat from './screens/Chat'
import Cabinet from './screens/Cabinet'
import Profile from './screens/Profile'
import Onboarding from './screens/Onboarding'
import CabinetAdd from './screens/CabinetAdd'
import CabinetDetail from './screens/CabinetDetail'
import History from './screens/History'
import Schedule from './screens/Schedule'
import StackBuilder from './screens/StackBuilder'
import DoctorPrep from './screens/DoctorPrep'
import SideEffects from './screens/SideEffects'
import Journal from './screens/Journal'
import Progress from './screens/Progress'
import Goals from './screens/Goals'
import Notifications from './screens/Notifications'
import Bloodwork from './screens/Bloodwork'
import NutritionTracker from './screens/NutritionTracker'
import NutritionAdd from './screens/NutritionAdd'
import NutritionDetail from './screens/NutritionDetail'
import FoodDatabase from './screens/FoodDatabase'

// Placeholder screens for routes not yet built
function Placeholder({ title }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-ink3 px-5">
      <p className="text-[15px] font-medium">{title}</p>
      <p className="text-[13px]">Coming soon</p>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return null
  if (!isAuthenticated) return <Navigate to="/auth?mode=login" replace />
  return <WebShell>{children}</WebShell>
}

function OnboardingRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return null
  if (!isAuthenticated) return <Navigate to="/auth?mode=login" replace />
  return children
}

function PublicRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return null
  if (isAuthenticated) return <Navigate to="/home" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />

      {/* Protected */}
      <Route path="/home"          element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/chat"          element={<ProtectedRoute><Chat /></ProtectedRoute>} />
      <Route path="/cabinet"       element={<ProtectedRoute><Cabinet /></ProtectedRoute>} />
      <Route path="/profile"       element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/onboarding"    element={<OnboardingRoute><Onboarding /></OnboardingRoute>} />
      <Route path="/cabinet/add"   element={<ProtectedRoute><CabinetAdd /></ProtectedRoute>} />
      <Route path="/cabinet/:id"   element={<ProtectedRoute><CabinetDetail /></ProtectedRoute>} />
      <Route path="/schedule"      element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
      <Route path="/stack-builder" element={<ProtectedRoute><StackBuilder /></ProtectedRoute>} />
      <Route path="/doctor-prep"   element={<ProtectedRoute><DoctorPrep /></ProtectedRoute>} />
      <Route path="/history"       element={<ProtectedRoute><History /></ProtectedRoute>} />
      <Route path="/side-effects"  element={<ProtectedRoute><SideEffects /></ProtectedRoute>} />
      <Route path="/journal"       element={<ProtectedRoute><Journal /></ProtectedRoute>} />
      <Route path="/progress"      element={<ProtectedRoute><Progress /></ProtectedRoute>} />
      <Route path="/goals"          element={<ProtectedRoute><Goals /></ProtectedRoute>} />
      <Route path="/bloodwork"     element={<ProtectedRoute><Bloodwork /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/nutrition"     element={<ProtectedRoute><NutritionTracker /></ProtectedRoute>} />
      <Route path="/nutrition/add"     element={<ProtectedRoute><NutritionAdd /></ProtectedRoute>} />
      <Route path="/nutrition/food-db" element={<ProtectedRoute><FoodDatabase /></ProtectedRoute>} />
      <Route path="/nutrition/:id"     element={<ProtectedRoute><NutritionDetail /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function GlobalAiUsageBadge() {
  return <AiUsageBadge />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <AiUsageProvider>
            <AppRoutes />
            <GlobalAiUsageBadge />
          </AiUsageProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
