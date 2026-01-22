import { useRecommendations, useGenerateRecommendations } from "@/hooks/use-recommendations";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Sparkles, BookPlus, RefreshCcw } from "lucide-react";
import { useCreateBook } from "@/hooks/use-books";
import { motion } from "framer-motion";

export default function Recommendations() {
  const { data: recommendations, isLoading } = useRecommendations();
  const generate = useGenerateRecommendations();
  const createBook = useCreateBook();

  const handleAddBook = (title: string, author: string) => {
    createBook.mutate({
      title,
      author,
      status: "want_to_read",
      userId: "temp",
    });
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8 md:px-6 md:py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
          <div className="text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Next Great Read</h1>
            <p className="text-muted-foreground mt-2 max-w-xl">
              Personalized suggestions based on your reading history and ratings.
            </p>
          </div>
          <Button 
            size="lg" 
            onClick={() => generate.mutate()} 
            disabled={generate.isPending}
            className="bg-accent hover:bg-accent/90 text-white shadow-lg shadow-accent/20"
          >
            {generate.isPending ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <RefreshCcw className="mr-2 h-5 w-5" />
            )}
            Refresh Recommendations
          </Button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground animate-pulse">Analyzing your taste...</p>
          </div>
        ) : (
          <>
            {recommendations && recommendations.length > 0 ? (
              <motion.div 
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {recommendations.map((rec) => (
                  <motion.div key={rec.id} variants={item}>
                    <Card className="h-full flex flex-col border-border/60 hover:border-primary/50 transition-colors shadow-sm hover:shadow-md">
                      <CardHeader className="pb-3">
                        <CardTitle className="font-display text-xl leading-tight">
                          {rec.bookTitle}
                        </CardTitle>
                        <p className="text-sm font-medium text-muted-foreground">by {rec.bookAuthor}</p>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <div className="bg-secondary/30 p-4 rounded-lg">
                          <p className="text-sm leading-relaxed text-foreground/80 italic">"{rec.reason}"</p>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-4 border-t border-border/30">
                        <Button 
                          className="w-full" 
                          variant="outline"
                          onClick={() => handleAddBook(rec.bookTitle, rec.bookAuthor)}
                          disabled={createBook.isPending}
                        >
                          <BookPlus className="mr-2 h-4 w-4" />
                          Add to Want to Read
                        </Button>
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-secondary/10 rounded-2xl border border-dashed border-border">
                <div className="bg-accent/10 p-6 rounded-full mb-6">
                  <Sparkles className="h-10 w-10 text-accent" />
                </div>
                <h3 className="text-xl font-display font-bold mb-2">No recommendations yet</h3>
                <p className="text-muted-foreground max-w-md mb-8">
                  Add more books to your library or click refresh to get AI-powered suggestions tailored just for you.
                </p>
                <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
                  Generate Suggestions
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
