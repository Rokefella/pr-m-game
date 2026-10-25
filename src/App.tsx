import MovementDebugOverlay from "@/components/MovementDebugOverlay";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { BETA_MODE } from '@/lib/config';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import Index from "./pages/Index.tsx";

import ProfileSetup from "./pages/ProfileSetup.tsx";
import Village from "./pages/Village.tsx";
import Door from "./pages/Door.tsx";
import LibraryDoor from "./pages/LibraryDoor.tsx";
import LibraryRoom from "./pages/LibraryRoom.tsx";
import ExchangeDoor from "./pages/ExchangeDoor.tsx";
import ExchangeRoom from "./pages/ExchangeRoom.tsx";
import Maze from "./pages/Maze.tsx";
import ShadowRealm from "./pages/ShadowRealm.tsx";
import Paywall from "./pages/Paywall.tsx";
import BernardRoomDynamic from "./pages/BernardRoomDynamic.tsx";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";
import AvatarPreview from "./pages/AvatarPreview.tsx";
import Intro from "./pages/Intro.tsx";
import DynamicRoom from "./pages/DynamicRoom.tsx";
import TilePreview from "./pages/TilePreview.tsx";
import GardenPreview from "./pages/GardenPreview.tsx";
import WorldTest from "./pages/WorldTest.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <MovementDebugOverlay />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/welcome" element={<Navigate to="/intro" replace />} />
            
            <Route path="/intro" element={<Intro />} />
            <Route path="/profile-setup" element={<ProfileSetup />} />
            <Route path="/village" element={<Village />} />
            <Route path="/door" element={<Door />} />
            <Route path="/library-door" element={<LibraryDoor />} />
            <Route path="/library" element={<LibraryRoom />} />
            <Route path="/exchange-door" element={<ExchangeDoor />} />
            <Route path="/exchange" element={<ExchangeRoom />} />

            <Route path="/maze" element={<Maze />} />
            <Route path="/shadow" element={<ShadowRealm />} />
            <Route path="/paywall" element={BETA_MODE ? <Navigate to="/village" replace /> : <Paywall />} />
            <Route path="/bernard-room" element={<BernardRoomDynamic />} />
            <Route path="/avatar-preview" element={<AvatarPreview />} />
            <Route path="/tiles" element={<TilePreview />} />
            <Route path="/room/:levelNumber/:locationKey" element={<DynamicRoom />} />
            <Route path="/garden-preview" element={<GardenPreview />} />
            <Route path="/world" element={<WorldTest />} />
            <Route path="/world-test" element={<Navigate to="/world" replace />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
