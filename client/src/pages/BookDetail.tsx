import { useRoute } from "wouter";
import { useBook, useGenerateSummary, useUpdateBook } from "@/hooks/use-books";
import { useGenerateQuiz } from "@/hooks/use-quizzes";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, BrainCircuit, ArrowLeft, BookOpen, Calendar, Edit3, Search, MessageSquare, List, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

function CollapsibleSection({ 
  children, 
  hasContent,
  defaultExpanded = false
}: { 
  children: React.ReactNode;
  hasContent: boolean;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const contentRef = useRef<HTMLDivElement>(null);
  const [needsCollapse, setNeedsCollapse] = useState(false);
  const [collapseHeight, setCollapseHeight] = useState<number>(120);

  useEffect(() => {
    if (contentRef.current && hasContent) {
      const computedStyle = getComputedStyle(contentRef.current);
      const lineHeight = parseFloat(computedStyle.lineHeight) || 24;
      const calculatedHeight = lineHeight * 5;
      setCollapseHeight(calculatedHeight);
      setNeedsCollapse(contentRef.current.scrollHeight > calculatedHeight + 10);
    }
  }, [children, hasContent]);

  if (!hasContent) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div 
        ref={contentRef}
        className="overflow-hidden transition-all duration-300"
        style={!isExpanded && needsCollapse ? { 
          maxHeight: `${collapseHeight}px`,
          WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
          maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)'
        } : undefined}
      >
        {children}
      </div>
      {needsCollapse && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full mt-2 text-muted-foreground"
          onClick={() => setIsExpanded(!isExpanded)}
          data-testid="button-toggle-expand"
        >
          {isExpanded ? (
            <>Show Less <ChevronUp className="ml-1 h-4 w-4" /></>
          ) : (
            <>Show More <ChevronDown className="ml-1 h-4 w-4" /></>
          )}
        </Button>
      )}
    </div>
  );
}

function CollapsibleListSection<T>({ 
  items,
  previewCount = 2,
  renderItem,
  emptyState
}: { 
  items: T[];
  previewCount?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  emptyState?: React.ReactNode;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (items.length === 0) {
    return <>{emptyState}</>;
  }

  const displayItems = isExpanded ? items : items.slice(0, previewCount);
  const hasMore = items.length > previewCount;

  return (
    <div className="space-y-4">
      {displayItems.map((item, idx) => renderItem(item, idx))}
      {hasMore && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full text-muted-foreground"
          onClick={() => setIsExpanded(!isExpanded)}
          data-testid="button-toggle-list-expand"
        >
          {isExpanded ? (
            <>Show Less <ChevronUp className="ml-1 h-4 w-4" /></>
          ) : (
            <>Show {items.length - previewCount} More <ChevronDown className="ml-1 h-4 w-4" /></>
          )}
        </Button>
      )}
    </div>
  );
}

export default function BookDetail() {
  const [, params] = useRoute("/book/:id");
  const [, setLocation] = useLocation();
  const id = parseInt(params?.id || "0");
  
  const { data: book, isLoading } = useBook(id);
  const generateSummary = useGenerateSummary(id);
  const generateQuiz = useGenerateQuiz(id);
  const updateBook = useUpdateBook();

  const [notes, setNotes] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [quizDifficulty, setQuizDifficulty] = useState<"beginner" | "easy" | "medium" | "hard" | "expert">("medium");
  const [summaryLength, setSummaryLength] = useState<"short" | "medium" | "detailed">("medium");
  const [showCoverSelector, setShowCoverSelector] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const prevChatLength = useRef<number | null>(null);
  const hasScrolledOnce = useRef(false);

  const chatHistory = (book as any)?.chatHistory as { role: 'user' | 'assistant', content: string }[] | null;

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    hasScrolledOnce.current = false;
    prevChatLength.current = null;
  }, [id]);

  useEffect(() => {
    if (chatHistory && chatHistory.length > 0) {
      if (prevChatLength.current !== null && chatHistory.length > prevChatLength.current) {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
      prevChatLength.current = chatHistory.length;
    }
  }, [chatHistory]);

  const { mutate: generateChapters, isPending: isGeneratingChapters } = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/books/${id}/chapters`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/books/${id}`] });
    }
  });

  const { mutate: sendMessage, isPending: isSendingMessage } = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", `/api/books/${id}/chat`, { message });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/books/${id}`] });
      setChatMessage("");
    }
  });

  const { data: covers, isLoading: isLoadingCovers } = useQuery({
    queryKey: ["/api/books/covers", book?.title, book?.author],
    queryFn: async () => {
      if (!book?.title) return [];
      const res = await apiRequest("GET", `/api/books/covers?title=${encodeURIComponent(book.title)}&author=${encodeURIComponent(book.author)}`);
      return res.json();
    },
    enabled: showCoverSelector && !!book?.title,
  });

  useEffect(() => {
    if (covers && covers.length > 0 && !book?.coverUrl && showCoverSelector && !updateBook.isPending) {
      const firstCoverUrl = covers[0].url;
      updateBook.mutate({ id, coverUrl: firstCoverUrl });
      setShowCoverSelector(false);
    }
  }, [covers, book?.coverUrl, showCoverSelector, updateBook.isPending, id]);

  useEffect(() => {
    if (book?.userNotes) {
      setNotes(book.userNotes);
    }
  }, [book]);

  const handleSaveNotes = () => {
    updateBook.mutate({ id, userNotes: notes });
    setIsEditingNotes(false);
  };

  const handleUpdateCover = (url: string) => {
    updateBook.mutate({ id, coverUrl: url });
    setShowCoverSelector(false);
  };

  const handleGenerateSummary = async () => {
    await generateSummary.mutateAsync(summaryLength);
  };

  const handleGenerateQuiz = async () => {
    const quiz = await generateQuiz.mutateAsync({ difficulty: quizDifficulty });
    setLocation(`/quiz/${quiz.id}`);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || isSendingMessage) return;
    sendMessage(chatMessage);
  };

  const DefaultCover = () => (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-secondary/40 to-muted/40 backdrop-blur-sm">
      <div className="space-y-4 max-w-full">
        <div className="space-y-1">
          <h3 className="font-display font-bold text-2xl leading-tight break-words px-2">{book?.title}</h3>
          <p className="text-sm text-muted-foreground italic line-clamp-1">A literary work</p>
        </div>
        
        <div className="w-16 h-px bg-border mx-auto opacity-50" />
        
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground uppercase tracking-widest">{book?.author}</p>
          <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter opacity-70">
            {book?.createdAt && `Added ${new Date(book.createdAt).getFullYear()}`}
          </div>
        </div>

        <div className="pt-6">
           <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/20" />
        </div>
      </div>
    </div>
  );

  if (isLoading) return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (!book) return (
    <div className="flex flex-col h-screen items-center justify-center bg-background">
      <h1 className="text-2xl font-bold mb-4">Book not found</h1>
      <Link href="/">
        <Button>Return Home</Button>
      </Link>
    </div>
  );

  const chapterSummaries = (book as any).chapterSummaries as { chapter: string, summary: string }[] | null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8 md:px-6 md:py-12 max-w-5xl">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Library
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {/* Left Column: Cover & Actions */}
          <div className="md:col-span-1 space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="aspect-[2/3] bg-muted rounded-lg overflow-hidden shadow-xl border border-border/50 relative group"
            >
              {book.coverUrl ? (
                <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
              ) : (
                <DefaultCover />
              )}
              
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-6 gap-3">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setShowCoverSelector(!showCoverSelector)}
                >
                  <Search className="h-4 w-4 mr-2" />
                  {book.coverUrl ? 'Change Cover' : 'Find Cover'}
                </Button>
                {book.coverUrl && (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="w-full"
                    onClick={() => handleUpdateCover('')}
                  >
                    Remove Cover
                  </Button>
                )}
              </div>
            </motion.div>

            {showCoverSelector && (
              <Card className="border-border/60 bg-card shadow-lg">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-display">Select Cover Art</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                    {isLoadingCovers ? (
                      <div className="col-span-2 flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : covers && covers.length > 0 ? (
                      covers.map((c: any) => (
                        <button
                          key={c.id}
                          className="relative aspect-[2/3] rounded overflow-hidden border hover:border-primary transition-all group"
                          onClick={() => handleUpdateCover(c.url)}
                        >
                          <img src={c.url} alt="Option" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))
                    ) : (
                      <div className="col-span-2 text-center py-8 text-xs text-muted-foreground">
                        No results found
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full mt-4 text-xs" 
                    onClick={() => setShowCoverSelector(false)}
                  >
                    Cancel
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="difficulty" className="text-sm font-medium">Quiz Difficulty</Label>
                <Select value={quizDifficulty} onValueChange={(val: any) => setQuizDifficulty(val)}>
                  <SelectTrigger id="difficulty" data-testid="select-quiz-difficulty" className="w-full bg-background/50 backdrop-blur-sm">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover/80 backdrop-blur-md">
                    <SelectItem value="beginner">Beginner (Basic Recall)</SelectItem>
                    <SelectItem value="easy">Easy (Factual)</SelectItem>
                    <SelectItem value="medium">Medium (Thematic)</SelectItem>
                    <SelectItem value="hard">Hard (Analytical)</SelectItem>
                    <SelectItem value="expert">Expert (Deep Analysis)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                className="w-full"
                onClick={handleGenerateQuiz}
                disabled={generateQuiz.isPending}
                data-testid="button-take-quiz"
              >
                {generateQuiz.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
                Take AI Quiz
              </Button>
            </div>

            <Card className="bg-muted/30 border-border/60">
              <CardContent className="p-4 space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className="capitalize bg-background">{book.status.replace(/_/g, " ")}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Added</span>
                  <span className="font-medium">{book.createdAt ? new Date(book.createdAt).toLocaleDateString() : 'N/A'}</span>
                </div>
                {book.dateRead && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Finished</span>
                    <span className="font-medium">{new Date(book.dateRead).toLocaleDateString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Details & Content */}
          <div className="md:col-span-2 space-y-8">
            <div>
              <motion.h1 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-5xl font-display font-bold text-foreground mb-2 leading-tight"
              >
                {book.title}
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-xl text-muted-foreground font-medium"
              >
                by <span className="text-foreground">{book.author}</span>
              </motion.p>
            </div>

            <Separator />

            {/* AI Summary Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-2xl font-display font-bold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  AI Summary
                </h2>
                <div className="flex items-center gap-2">
                  <Select value={summaryLength} onValueChange={(val: any) => setSummaryLength(val)}>
                    <SelectTrigger className="w-[150px]" data-testid="select-summary-length">
                      <SelectValue placeholder="Length" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short (~500 chars)</SelectItem>
                      <SelectItem value="medium">Medium (~1500 chars)</SelectItem>
                      <SelectItem value="detailed">Detailed (~5000 chars)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleGenerateSummary}
                    disabled={generateSummary.isPending}
                    data-testid="button-generate-summary"
                  >
                    {generateSummary.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Sparkles className="h-3 w-3 mr-2" />}
                    {book.aiSummary ? 'Regenerate' : 'Generate'}
                  </Button>
                </div>
              </div>
              
              <div className="bg-card border border-border/60 rounded-xl p-6 shadow-sm">
                {book.aiSummary ? (
                  <CollapsibleSection hasContent={!!book.aiSummary}>
                    <div className="prose prose-stone max-w-none text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      {book.aiSummary}
                    </div>
                  </CollapsibleSection>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="mb-4">No summary generated yet.</p>
                    <Button onClick={handleGenerateSummary} disabled={generateSummary.isPending} data-testid="button-generate-summary-empty">
                      Generate with AI
                    </Button>
                  </div>
                )}
              </div>
            </section>

            {/* Chapter Summaries Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-display font-bold flex items-center gap-2">
                  <List className="h-5 w-5 text-indigo-500" />
                  Chapter Summaries
                </h2>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => generateChapters()}
                  disabled={isGeneratingChapters}
                >
                  {isGeneratingChapters ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Sparkles className="h-3 w-3 mr-2" />}
                  {chapterSummaries ? 'Regenerate' : 'Generate Chapters'}
                </Button>
              </div>
              
              <CollapsibleListSection 
                items={chapterSummaries || []}
                previewCount={1}
                renderItem={(chapter, idx) => (
                  <Card key={idx} className="bg-card border-border/60">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-lg font-display">{chapter.chapter}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-sm text-foreground/80 leading-relaxed line-clamp-5">
                      {chapter.summary}
                    </CardContent>
                  </Card>
                )}
                emptyState={
                  <div className="bg-card border border-dashed border-border/60 rounded-xl p-8 text-center text-muted-foreground">
                    <p>No chapter summaries available.</p>
                  </div>
                }
              />
            </section>

            {/* AI Chat Section */}
            <section className="space-y-4">
              <h2 className="text-2xl font-display font-bold flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-emerald-500" />
                Discuss with AI
              </h2>
              
              <Card className="bg-card border-border/60 overflow-hidden">
                <div className="p-4">
                  {chatHistory && chatHistory.length > 0 ? (
                    <CollapsibleListSection
                      items={chatHistory}
                      previewCount={2}
                      renderItem={(msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                            msg.role === 'user' 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted text-foreground line-clamp-5'
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      )}
                    />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Ask anything about "{book.title}"</p>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-4 border-t bg-muted/30">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input 
                      placeholder="Ask about themes, characters, or plot..." 
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      disabled={isSendingMessage}
                      className="bg-background"
                    />
                    <Button type="submit" disabled={isSendingMessage || !chatMessage.trim()} size="icon">
                      {isSendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    </Button>
                  </form>
                </div>
              </Card>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-display font-bold flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-primary" />
                  My Notes
                </h2>
                {isEditingNotes ? (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditingNotes(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleSaveNotes} disabled={updateBook.isPending}>Save</Button>
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setIsEditingNotes(true)}>Edit</Button>
                )}
              </div>
              
              {isEditingNotes ? (
                <Textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Jot down your thoughts, quotes, or ideas..."
                  className="min-h-[200px] text-base leading-relaxed p-4"
                />
              ) : (
                <div 
                  className="bg-secondary/30 border border-border/40 rounded-xl p-6 min-h-[100px] cursor-pointer hover:bg-secondary/50 transition-colors"
                  onClick={() => setIsEditingNotes(true)}
                >
                  {book.userNotes ? (
                    <p className="whitespace-pre-wrap text-foreground/90 leading-relaxed">{book.userNotes}</p>
                  ) : (
                    <p className="text-muted-foreground italic">Click to add your personal notes...</p>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
