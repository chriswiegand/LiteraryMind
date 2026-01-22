import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import BookDetail from "@/pages/BookDetail";
import Quiz from "@/pages/Quiz";
import QuizStats from "@/pages/QuizStats";
import Recommendations from "@/pages/Recommendations";
import Badges from "@/pages/Badges";
import BookClubs from "@/pages/BookClubs";
import Landing from "@/pages/Landing";

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Landing />;
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/book/:id" component={BookDetail} />
      <Route path="/quiz/:id" component={Quiz} />
      <Route path="/stats" component={QuizStats} />
      <Route path="/recommendations" component={Recommendations} />
      <Route path="/badges" component={Badges} />
      <Route path="/clubs" component={BookClubs} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
