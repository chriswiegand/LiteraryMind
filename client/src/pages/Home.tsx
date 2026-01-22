import { useState, useMemo } from "react";
import { useBooks } from "@/hooks/use-books";
import { Navigation } from "@/components/Navigation";
import { AddBookDialog } from "@/components/AddBookDialog";
import { BookPhotoScanner } from "@/components/BookPhotoScanner";
import { BookCard } from "@/components/BookCard";
import { ExternalBookSearch } from "@/components/ExternalBookSearch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, Loader2, BookOpen, Grid3X3, List, SortAsc, ChevronDown, ChevronRight, Sparkles, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { Book } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type SortOption = "title" | "author" | "dateAdded" | "rating" | "status";
type GroupOption = "none" | "author" | "status" | "genre" | "ai";
type ViewMode = "grid" | "list";

interface AIGroup {
  name: string;
  description: string;
  bookIds: number[];
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortOption>("dateAdded");
  const [groupBy, setGroupBy] = useState<GroupOption>("none");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [aiGroups, setAiGroups] = useState<AIGroup[]>([]);
  const [isLoadingAiGroups, setIsLoadingAiGroups] = useState(false);
  const { toast } = useToast();
  
  const queryStatus = activeTab === "all" ? undefined : activeTab as any;
  const { data: books, isLoading } = useBooks(queryStatus, search);

  const sortedBooks = useMemo(() => {
    if (!books) return [];
    let filtered = [...books];
    
    if (showFavoritesOnly) {
      filtered = filtered.filter(b => b.isFavorite);
    }
    
    return filtered.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      
      switch (sortBy) {
        case "title":
          return a.title.localeCompare(b.title);
        case "author":
          return a.author.localeCompare(b.author);
        case "dateAdded":
          return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
        case "rating":
          return (b.rating || 0) - (a.rating || 0);
        case "status":
          const statusOrder = { reading: 0, want_to_read: 1, read: 2 };
          return (statusOrder[a.status as keyof typeof statusOrder] || 0) - (statusOrder[b.status as keyof typeof statusOrder] || 0);
        default:
          return 0;
      }
    });
  }, [books, sortBy, showFavoritesOnly]);

  const groupedBooks = useMemo(() => {
    if (groupBy === "none" || groupBy === "ai") return { "All Books": sortedBooks };
    
    const groups: Record<string, Book[]> = {};
    
    sortedBooks.forEach(book => {
      let key: string;
      switch (groupBy) {
        case "author":
          key = book.author;
          break;
        case "status":
          key = book.status === "want_to_read" ? "Want to Read" : 
                book.status === "reading" ? "Currently Reading" : "Completed";
          break;
        case "genre":
          key = book.genre || "Uncategorized";
          break;
        default:
          key = "Other";
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(book);
    });
    
    return groups;
  }, [sortedBooks, groupBy]);

  const displayGroups = groupBy === "ai" && aiGroups.length > 0
    ? aiGroups.reduce((acc, group) => {
        acc[group.name] = sortedBooks.filter(b => group.bookIds.includes(b.id));
        return acc;
      }, {} as Record<string, Book[]>)
    : groupedBooks;

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  const handleAiGrouping = async () => {
    setIsLoadingAiGroups(true);
    try {
      const res = await apiRequest("POST", "/api/books/ai-grouping");
      const data = await res.json();
      setAiGroups(data.groups || []);
      setGroupBy("ai");
      toast({ title: "AI Grouping Complete", description: `Created ${data.groups?.length || 0} thematic groups.` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate AI grouping.", variant: "destructive" });
    } finally {
      setIsLoadingAiGroups(false);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
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
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">My Library</h1>
            <p className="text-muted-foreground mt-1">Track your reading journey and discover insights.</p>
          </div>
          <div className="flex items-center gap-2">
            <BookPhotoScanner />
            <AddBookDialog />
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
                <TabsList className="grid w-full grid-cols-4 md:w-[400px]">
                  <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
                  <TabsTrigger value="reading" data-testid="tab-reading">Reading</TabsTrigger>
                  <TabsTrigger value="want_to_read" data-testid="tab-to-read">To Read</TabsTrigger>
                  <TabsTrigger value="read" data-testid="tab-read">Read</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search books..." 
                  className="pl-9 bg-background border-border/60 focus:border-primary/50 transition-all"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="input-search"
                />
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 border rounded-md p-1">
                <Button
                  size="icon"
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  onClick={() => setViewMode("grid")}
                  data-testid="button-view-grid"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  onClick={() => setViewMode("list")}
                  data-testid="button-view-list"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-[140px]" data-testid="select-sort">
                  <SortAsc className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dateAdded">Date Added</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="author">Author</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupOption)}>
                <SelectTrigger className="w-[140px]" data-testid="select-group">
                  <SelectValue placeholder="Group by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Grouping</SelectItem>
                  <SelectItem value="author">Author</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="genre">Genre</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant={showFavoritesOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                data-testid="button-favorites-filter"
              >
                <Heart className={`h-4 w-4 mr-1 ${showFavoritesOnly ? "fill-current" : ""}`} />
                Favorites
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleAiGrouping}
                disabled={isLoadingAiGroups || !books?.length}
                data-testid="button-ai-group"
              >
                {isLoadingAiGroups ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                AI Group
              </Button>
            </div>
          </div>

          {search && (
            <ExternalBookSearch query={search} />
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {sortedBooks.length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(displayGroups).map(([groupName, groupBooks]) => (
                    <Collapsible 
                      key={groupName} 
                      open={!collapsedGroups.has(groupName)}
                      onOpenChange={() => toggleGroup(groupName)}
                    >
                      {groupBy !== "none" && (
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full justify-start gap-2 mb-3 text-lg font-semibold">
                            {collapsedGroups.has(groupName) ? <ChevronRight className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                            {groupName}
                            <span className="text-muted-foreground font-normal text-sm">({groupBooks.length})</span>
                          </Button>
                        </CollapsibleTrigger>
                      )}
                      <CollapsibleContent>
                        <motion.div 
                          variants={container}
                          initial="hidden"
                          animate="show"
                          className={viewMode === "grid" 
                            ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
                            : "flex flex-col gap-3"
                          }
                        >
                          {groupBooks.map((book) => (
                            <motion.div key={book.id} variants={item}>
                              <BookCard book={book} viewMode={viewMode} />
                            </motion.div>
                          ))}
                        </motion.div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-border/50 rounded-xl bg-muted/20">
                  <div className="bg-primary/10 p-4 rounded-full mb-4">
                    <BookOpen className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold font-display">No books found</h3>
                  <p className="text-muted-foreground max-w-sm mt-2 mb-6">
                    {search ? "No matches for your search." : showFavoritesOnly ? "No favorite books yet." : "Your library is empty. Add a book to get started!"}
                  </p>
                  {!search && !showFavoritesOnly && <AddBookDialog />}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
