import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import Index from "./pages/Index.tsx";
import EntityQuestions from "./pages/EntityQuestions.tsx";
import ProfileSetup from "./pages/ProfileSetup.tsx";
import Village from "./pages/Village.tsx";
import Door from "./pages/Door.tsx";
import LibraryDoor from "./pages/LibraryDoor.tsx";
import ExchangeDoor from "./pages/ExchangeDoor.tsx";
import Maze from "./pages/Maze.tsx";
import ShadowRealm from "./pages/ShadowRealm.tsx";
import Paywall from "./pages/Paywall.tsx";
import BernardRoom1 from "./pages/BernardRoom1.tsx";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/Login.tsx";
import Signup from "./pages/Signup.tsx";
import AvatarPreview from "./pages/AvatarPreview.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/entity-questions" element={<EntityQuestions />} />
            <Route path="/profile-setup" element={<ProfileSetup />} />
            <Route path="/village" element={<Village />} />
            <Route path="/door" element={<Door />} />
            <Route path="/library-door" element={<LibraryDoor />} />
            <Route path="/exchange-door" element={<ExchangeDoor />} />
            <Route path="/maze" element={<Maze />} />
            <Route path="/shadow" element={<ShadowRealm />} />
            <Route path="/paywall" element={<Paywall />} />
            <Route path="/bernard-room-1" element={<BernardRoom1 />} />
            <Route path="/avatar-preview" element={<AvatarPreview />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
