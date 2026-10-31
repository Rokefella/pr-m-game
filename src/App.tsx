import { lazy, Suspense } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import { preloadWorld } from "@/lib/routePreload";
import MovementDebugOverlay from "@/components/MovementDebugOverlay";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { BETA_MODE } from '@/lib/config';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import Index from "./pages/Index.tsx";

const ProfileSetup = lazy(() => import("./pages/ProfileSetup.tsx"));
const Door = lazy(() => import("./pages/Door.tsx"));
const LibraryDoor = lazy(() => import("./pages/LibraryDoor.tsx"));
const LibraryRoom = lazy(() => import("./pages/LibraryRoom.tsx"));
const ExchangeDoor = lazy(() => import("./pages/ExchangeDoor.tsx"));
const ExchangeRoom = lazy(() => import("./pages/ExchangeRoom.tsx"));
const Maze = lazy(() => import("./pages/Maze.tsx"));
const ShadowRealm = lazy(() => import("./pages/ShadowRealm.tsx"));
const Paywall = lazy(() => import("./pages/Paywall.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";
const AvatarPreview = lazy(() => import("./pages/AvatarPreview.tsx"));
const Intro = lazy(() => import("./pages/Intro.tsx"));
const DynamicRoom = lazy(() => import("./pages/DynamicRoom.tsx"));
const TilePreview = lazy(() => import("./pages/TilePreview.tsx"));
const GardenPreview = lazy(() => import("./pages/GardenPreview.tsx"));
const WorldTest = lazy(preloadWorld);
import DevNotepad from '@/components/DevNotepad';
import SaveFailedNotice from '@/components/SaveFailedNotice';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <MovementDebugOverlay />
        <BrowserRouter>
          <DevNotepad />
          <SaveFailedNotice />
          <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/welcome" element={<Navigate to="/intro" replace />} />
            
            <Route path="/intro" element={<Intro />} />
            <Route path="/profile-setup" element={<ProfileSetup />} />
            <Route path="/village" element={<Navigate to="/world" replace />} />
            <Route path="/door" element={<Door />} />
            <Route path="/library-door" element={<LibraryDoor />} />
            <Route path="/library" element={<LibraryRoom />} />
            <Route path="/exchange-door" element={<ExchangeDoor />} />
            <Route path="/exchange" element={<ExchangeRoom />} />

            <Route path="/maze" element={<Maze />} />
            <Route path="/shadow" element={<ShadowRealm />} />
            <Route path="/paywall" element={BETA_MODE ? <Navigate to="/world" replace /> : <Paywall />} />
            <Route path="/bernard-room" element={<Navigate to="/world" replace />} />
            <Route path="/avatar-preview" element={<AvatarPreview />} />
            <Route path="/tiles" element={<TilePreview />} />
            <Route path="/room/:levelNumber/:locationKey" element={<DynamicRoom />} />
            <Route path="/garden-preview" element={<GardenPreview />} />
            <Route path="/world" element={<WorldTest />} />
            <Route path="/world-test" element={<Navigate to="/world" replace />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
