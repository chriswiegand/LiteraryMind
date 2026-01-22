import { Book } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { BookOpen, Check, Clock, Heart } from "lucide-react";
import { useUpdateBook } from "@/hooks/use-books";

interface BookCardProps {
  book: Book;
  viewMode?: "grid" | "list";
}

export function BookCard({ book, viewMode = "grid" }: BookCardProps) {
  const updateBook = useUpdateBook();

  const handleStatusChange = (newStatus: "reading" | "read") => {
    updateBook.mutate({ id: book.id, status: newStatus });
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateBook.mutate({ id: book.id, isFavorite: !book.isFavorite });
  };

  const statusColors = {
    want_to_read: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    reading: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    read: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  };

  const statusLabels = {
    want_to_read: "Want to Read",
    reading: "Reading",
    read: "Read",
  };

  const DefaultCover = () => (
    <div className="flex flex-col items-center justify-center p-6 text-center h-full w-full bg-gradient-to-br from-secondary/50 to-muted/50 border-b">
      <div className="space-y-2">
        <h4 className="font-display font-bold text-sm line-clamp-2 leading-tight px-2">{book.title}</h4>
        <div className="w-8 h-px bg-border mx-auto opacity-50" />
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{book.author}</p>
      </div>
    </div>
  );

  if (viewMode === "list") {
    return (
      <Card className="flex flex-row overflow-hidden bg-card hover-elevate border-border/60">
        <div className="relative w-20 h-28 flex-shrink-0 bg-muted">
          {book.coverUrl ? (
            <img 
              src={book.coverUrl} 
              alt={book.title} 
              className="h-full w-full object-cover" 
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-secondary/50 to-muted/50">
              <BookOpen className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>
        <CardContent className="flex-1 p-3 flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className={`${statusColors[book.status as keyof typeof statusColors]} border-0 text-xs`}>
                {statusLabels[book.status as keyof typeof statusLabels]}
              </Badge>
              {book.isFavorite && <Heart className="h-3 w-3 text-red-500 fill-red-500" />}
            </div>
            <Link href={`/book/${book.id}`}>
              <h3 className="font-display font-bold leading-tight truncate hover:text-primary transition-colors" data-testid={`text-book-title-${book.id}`}>
                {book.title}
              </h3>
            </Link>
            <p className="text-sm text-muted-foreground">{book.author}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={handleToggleFavorite}
              className={book.isFavorite ? "text-red-500" : "text-muted-foreground"}
              data-testid={`button-favorite-${book.id}`}
            >
              <Heart className={`h-4 w-4 ${book.isFavorite ? "fill-red-500" : ""}`} />
            </Button>
            <Link href={`/book/${book.id}`}>
              <Button size="sm" variant="outline" data-testid={`button-view-${book.id}`}>View</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col overflow-hidden bg-card book-card-hover border-border/60">
      <div className="relative aspect-[2/3] w-full bg-muted flex items-center justify-center overflow-hidden group">
        {book.coverUrl ? (
          <img 
            src={book.coverUrl} 
            alt={book.title} 
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" 
          />
        ) : (
          <DefaultCover />
        )}
        
        <Button
          size="icon"
          variant="ghost"
          onClick={handleToggleFavorite}
          className={`absolute top-2 right-2 bg-black/40 hover:bg-black/60 ${book.isFavorite ? "text-red-500" : "text-white"}`}
          data-testid={`button-favorite-${book.id}`}
        >
          <Heart className={`h-4 w-4 ${book.isFavorite ? "fill-red-500" : ""}`} />
        </Button>
        
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2 p-4">
           <Link href={`/book/${book.id}`} className="w-full">
            <Button variant="secondary" className="w-full font-semibold" data-testid={`button-view-details-${book.id}`}>
              View Details
            </Button>
           </Link>
           {book.status === 'want_to_read' && (
             <Button 
                onClick={(e) => { e.preventDefault(); handleStatusChange('reading'); }}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                size="sm"
                data-testid={`button-start-reading-${book.id}`}
             >
               Start Reading
             </Button>
           )}
           {book.status === 'reading' && (
             <Button 
                onClick={(e) => { e.preventDefault(); handleStatusChange('read'); }}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                size="sm"
                data-testid={`button-mark-finished-${book.id}`}
             >
               Mark Finished
             </Button>
           )}
        </div>
      </div>
      
      <CardContent className="flex-1 p-4 pt-5">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary" className={`${statusColors[book.status as keyof typeof statusColors]} border-0 font-medium`}>
            {statusLabels[book.status as keyof typeof statusLabels]}
          </Badge>
          {book.isFavorite && <Heart className="h-3 w-3 text-red-500 fill-red-500" />}
        </div>
        <h3 className="font-display text-lg font-bold leading-tight mb-1 line-clamp-2" title={book.title} data-testid={`text-book-title-${book.id}`}>
          {book.title}
        </h3>
        <p className="text-sm text-muted-foreground font-medium">{book.author}</p>
        
        {book.aiSummary && (
           <p className="text-xs text-muted-foreground mt-3 line-clamp-3 leading-relaxed">
             {book.aiSummary}
           </p>
        )}
      </CardContent>
    </Card>
  );
}
