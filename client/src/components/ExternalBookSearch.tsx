import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, BookOpen, ExternalLink } from "lucide-react";
import { useCreateBook } from "@/hooks/use-books";
import { useToast } from "@/hooks/use-toast";

interface ExternalBook {
  title: string;
  author: string;
  coverUrl?: string;
  description?: string;
  publishedDate?: string;
}

interface ExternalBookSearchProps {
  query: string;
}

export function ExternalBookSearch({ query }: ExternalBookSearchProps) {
  const { toast } = useToast();
  const createBook = useCreateBook();

  const { data: externalBooks, isLoading } = useQuery<ExternalBook[]>({
    queryKey: ["/api/external-books/search", query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      const res = await fetch(`/api/external-books/search?q=${encodeURIComponent(query)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to search");
      return res.json();
    },
    enabled: query.length >= 2,
  });

  const handleAddBook = async (book: ExternalBook) => {
    createBook.mutate({
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl,
      status: "want_to_read",
    }, {
      onSuccess: () => {
        toast({ title: "Book Added", description: `"${book.title}" has been added to your library.` });
      },
    });
  };

  if (!query || query.length < 2) return null;
  
  if (isLoading) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="p-4 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Searching for books...</span>
        </CardContent>
      </Card>
    );
  }

  if (!externalBooks || externalBooks.length === 0) return null;

  return (
    <Card className="bg-muted/30 border-dashed">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Add from Search Results</h3>
          <Badge variant="secondary" className="text-xs">External</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {externalBooks.slice(0, 6).map((book, index) => (
            <div
              key={`${book.title}-${index}`}
              className="flex gap-3 p-3 bg-background rounded-lg border border-border/50 hover-elevate"
            >
              {book.coverUrl ? (
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  className="w-12 h-18 object-cover rounded flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-18 bg-muted rounded flex items-center justify-center flex-shrink-0">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm line-clamp-1" title={book.title}>
                  {book.title}
                </h4>
                <p className="text-xs text-muted-foreground line-clamp-1">{book.author}</p>
                {book.publishedDate && (
                  <p className="text-xs text-muted-foreground mt-1">{book.publishedDate}</p>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 h-7 text-xs"
                  onClick={() => handleAddBook(book)}
                  disabled={createBook.isPending}
                  data-testid={`button-add-external-${index}`}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add to Library
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
