import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateBook } from "@/hooks/use-books";
import { Plus, Loader2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";

export function AddBookDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [status, setStatus] = useState<"want_to_read" | "reading" | "read">("want_to_read");
  const [coverUrl, setCoverUrl] = useState("");
  const [authorSearch, setAuthorSearch] = useState("");
  const [selectedAuthor, setSelectedAuthor] = useState<{ name: string; birthDate?: string; deathDate?: string } | null>(null);
  const [showCoverSelector, setShowCoverSelector] = useState(false);
  
  const createBook = useCreateBook();
  const { toast } = useToast();

  const authorsQuery = useQuery({
    queryKey: ["/api/authors/search", authorSearch],
    queryFn: async () => {
      if (!authorSearch) return [];
      const res = await apiRequest("GET", `/api/authors/search?q=${encodeURIComponent(authorSearch)}`);
      return res.json();
    },
    enabled: authorSearch.length > 2,
  });

  const authors = authorsQuery.data;
  const isLoadingAuthors = authorsQuery.isLoading;

  const { data: works, isLoading: isLoadingWorks } = useQuery({
    queryKey: ["/api/authors", selectedAuthor?.name, "works"],
    queryFn: async () => {
      if (!selectedAuthor) return [];
      const res = await apiRequest("GET", `/api/authors/${encodeURIComponent(selectedAuthor.name)}/works`);
      return res.json();
    },
    enabled: !!selectedAuthor,
  });

  const { data: covers, isLoading: isLoadingCovers } = useQuery({
    queryKey: ["/api/books/covers", title, author],
    queryFn: async () => {
      if (!title) return [];
      const res = await apiRequest("GET", `/api/books/covers?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}`);
      return res.json();
    },
    enabled: showCoverSelector && !!title,
  });

  useEffect(() => {
    if (!open) {
      setTitle("");
      setAuthor("");
      setAuthorSearch("");
      setSelectedAuthor(null);
      setStatus("want_to_read");
      setCoverUrl("");
      setShowCoverSelector(false);
    }
  }, [open]);

  useEffect(() => {
    if (covers && covers.length > 0 && !coverUrl && showCoverSelector) {
      setCoverUrl(covers[0].url);
    }
  }, [covers, coverUrl, showCoverSelector]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !author) {
      toast({ title: "Validation Error", description: "Title and Author are required.", variant: "destructive" });
      return;
    }

    try {
      await createBook.mutateAsync({
        title,
        author,
        status,
        coverUrl: coverUrl || (covers?.[0]?.url) || undefined,
        userId: user?.id || "temp",
      });
      setOpen(false);
    } catch (err) {}
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all">
          <Plus className="mr-2 h-4 w-4" /> Add Book
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Add a Book</DialogTitle>
            <DialogDescription>
              Search for an author to see their works and metadata.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="author" className="text-right">Author</Label>
              <div className="col-span-3 space-y-2">
                <Input
                  id="author"
                  value={authorSearch || author}
                  onChange={(e) => {
                    setAuthorSearch(e.target.value);
                    setAuthor(e.target.value);
                    if (selectedAuthor) setSelectedAuthor(null);
                  }}
                  placeholder="Search author..."
                />
                {isLoadingAuthors && <Loader2 className="h-4 w-4 animate-spin mx-auto" />}
                {authors && authors.length > 0 && !selectedAuthor && (
                  <div className="border rounded-md max-h-32 overflow-y-auto bg-background/80 backdrop-blur-md shadow-sm">
                    {authors.map((a: any) => (
                      <button
                        key={a.name}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors border-b last:border-0"
                        onClick={() => {
                          setSelectedAuthor(a);
                          setAuthor(a.name);
                          setAuthorSearch(a.name);
                        }}
                      >
                        <span className="font-medium">{a.name}</span>
                        {(a.birthDate || a.deathDate) && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({a.birthDate || "?"} - {a.deathDate || "?"})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">Title</Label>
              <div className="col-span-3 space-y-2">
                {selectedAuthor && works && works.length > 0 ? (
                  <Select value={title} onValueChange={setTitle}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a work" />
                    </SelectTrigger>
                    <SelectContent>
                      {works.map((w: any) => (
                        <SelectItem key={w.title} value={w.title}>
                          <div className="flex flex-col">
                            <span>{w.title}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {w.publicationDate && `Pub: ${w.publicationDate}`}
                              {w.material && ` • ${w.material}`}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter book title"
                    disabled={isLoadingWorks}
                  />
                )}
                {isLoadingWorks && <Loader2 className="h-4 w-4 animate-spin mx-auto" />}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">Status</Label>
              <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="want_to_read">Want to Read</SelectItem>
                  <SelectItem value="reading">Currently Reading</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Cover</Label>
              <div className="col-span-3 space-y-3">
                {coverUrl ? (
                  <div className="relative group w-24 aspect-[2/3] rounded-md overflow-hidden border">
                    <img src={coverUrl} alt="Selected cover" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setCoverUrl("")}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setShowCoverSelector(!showCoverSelector)}
                    disabled={!title}
                  >
                    <Search className="mr-2 h-4 w-4" />
                    {showCoverSelector ? "Hide Cover Options" : "Search for Cover Art"}
                  </Button>
                )}

                {showCoverSelector && (
                  <div className="grid grid-cols-3 gap-2 p-2 border rounded-md bg-muted/30">
                    {isLoadingCovers ? (
                      <div className="col-span-3 flex justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : covers && covers.length > 0 ? (
                      covers.map((c: any) => (
                        <button
                          key={c.id}
                          type="button"
                          className="relative aspect-[2/3] rounded overflow-hidden border hover:border-primary transition-colors group"
                          onClick={() => {
                            setCoverUrl(c.url);
                            setShowCoverSelector(false);
                          }}
                        >
                          <img src={c.url} alt="Cover option" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))
                    ) : (
                      <p className="col-span-3 text-xs text-center text-muted-foreground py-2">
                        No covers found for this title.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createBook.isPending || !title || !author}>
              {createBook.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add to Library
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
