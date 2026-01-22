import { Button } from "@/components/ui/button";
import { BookOpen, Sparkles, BrainCircuit } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="container mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="font-display text-xl font-bold">BookWise</span>
        </div>
        <Button onClick={handleLogin} variant="outline" className="font-medium">
          Sign In
        </Button>
      </header>

      <main className="flex-1 container mx-auto px-6 flex flex-col lg:flex-row items-center py-12 lg:py-24 gap-12">
        <div className="flex-1 space-y-8 animate-fade-in-up">
          <h1 className="text-5xl lg:text-7xl font-display font-bold leading-tight text-foreground">
            Read smarter,<br/>
            <span className="text-primary italic">retain more.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
            Your personal AI librarian. Track your reading, generate insightful summaries, and test your knowledge retention with auto-generated quizzes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button size="lg" onClick={handleLogin} className="text-lg px-8 h-12 shadow-xl shadow-primary/20">
              Get Started
            </Button>
            <Button size="lg" variant="secondary" className="text-lg px-8 h-12">
              View Demo
            </Button>
          </div>
          
          <div className="flex items-center gap-8 pt-8 text-sm font-medium text-muted-foreground">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <span>AI Summaries</span>
            </div>
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-accent" />
              <span>Smart Quizzes</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-accent" />
              <span>Reading Tracking</span>
            </div>
          </div>
        </div>

        <div className="flex-1 w-full max-w-lg lg:max-w-none relative">
          <div className="absolute top-0 right-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl -z-10" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent/10 rounded-full blur-3xl -z-10" />
          
          {/* Abstract Book Graphic Placeholder */}
          <div className="relative aspect-square rounded-2xl bg-gradient-to-br from-secondary to-background border border-border shadow-2xl p-8 flex items-center justify-center overflow-hidden">
             <div className="grid grid-cols-2 gap-4 w-full h-full opacity-80">
                <div className="bg-primary/20 rounded-lg h-4/5 w-full self-end transform translate-y-4" />
                <div className="bg-accent/20 rounded-lg h-full w-full" />
                <div className="bg-muted-foreground/10 rounded-lg h-full w-full" />
                <div className="bg-primary/10 rounded-lg h-3/5 w-full" />
             </div>
             <div className="absolute inset-0 flex items-center justify-center">
               <h3 className="font-display text-3xl font-bold bg-background/80 backdrop-blur px-8 py-4 rounded-xl shadow-lg border border-white/20">
                 Your Library Reimagined
               </h3>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}
