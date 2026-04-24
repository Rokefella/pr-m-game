import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import RootGate from "./pages/RootGate.tsx";
import EmailEntry from "./pages/EmailEntry.tsx";
import EntityQuestions from "./pages/EntityQuestions.tsx";
import ProfileSetup from "./pages/ProfileSetup.tsx";
import Village from "./pages/Village.tsx";
import Door from "./pages/Door.tsx";
import Maze from "./pages/Maze.tsx";
import ShadowRealm from "./pages/ShadowRealm.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootGate />} />
            <Route path="/email-entry" element={<EmailEntry />} />
            <Route path="/entity-questions" element={<EntityQuestions />} />
            <Route path="/profile-setup" element={<ProfileSetup />} />
            <Route path="/village" element={<Village />} />
            <Route path="/door" element={<Door />} />
            <Route path="/maze" element={<Maze />} />
            <Route path="/shadow" element={<ShadowRealm />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
