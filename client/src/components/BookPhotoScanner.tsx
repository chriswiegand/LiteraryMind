import { useState, useRef } from "react";
import { Camera, ImageIcon, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { cn } from "@/lib/utils";

export function BookPhotoScanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [foundBooks, setFoundBooks] = useState<{ title: string; author: string }[]>([]);
  const [selectedBooks, setSelectedBooks] = useState<number[]>([]);
  const { toast } = useToast();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      await identifyBooks(base64);
    };
    reader.readAsDataURL(file);
  };

  const identifyBooks = async (base64: string) => {
    setIsProcessing(true);
    setFoundBooks([]);
    setSelectedBooks([]);
    setIsOpen(true);

    try {
      const res = await apiRequest("POST", api.books.identify.path, { image: base64 });
      const data = await res.json();
      setFoundBooks(data.books || []);
      if (data.books?.length === 0) {
        toast({
          title: "No books found",
          description: "Try taking a clearer photo of the book covers.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to identify books from the photo.",
        variant: "destructive",
      });
      setIsOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddSelected = async () => {
    const toAdd = selectedBooks.map(idx => foundBooks[idx]);
    setIsProcessing(true);

    try {
      await Promise.all(
        toAdd.map(book => 
          apiRequest("POST", api.books.create.path, {
            ...book,
            status: "want_to_read"
          })
        )
      );

      toast({
        title: "Success",
        description: `Added ${toAdd.length} books to your list.`,
      });
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: [api.books.list.path] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add some books.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSelection = (idx: number) => {
    setSelectedBooks(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(e);
    e.target.value = "";
  };

  return (
    <>
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          onClick={() => cameraInputRef.current?.click()}
          className="hover-elevate"
          data-testid="button-use-camera"
        >
          <Camera className="mr-2 h-4 w-4" />
          Use Camera
        </Button>
        <Button 
          variant="outline" 
          onClick={() => libraryInputRef.current?.click()}
          className="hover-elevate"
          data-testid="button-choose-photo"
        >
          <ImageIcon className="mr-2 h-4 w-4" />
          Choose Photo
        </Button>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={cameraInputRef}
          onChange={handleInputChange}
          capture="environment"
        />
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={libraryInputRef}
          onChange={handleInputChange}
        />
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Identify Books</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col gap-4 py-4">
            {isProcessing && foundBooks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Identifying books using AI...</p>
              </div>
            ) : foundBooks.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select the books you'd like to add to your "Want to Read" list:
                </p>
                <div className="max-h-60 overflow-y-auto space-y-3 pr-2">
                  {foundBooks.map((book, idx) => {
                    const isSelected = selectedBooks.includes(idx);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleSelection(idx)}
                        aria-pressed={isSelected}
                        className={cn(
                          "w-full p-4 rounded-md text-left transition-colors border-2 hover-elevate active-elevate-2",
                          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                          isSelected
                            ? "bg-green-500 dark:bg-green-600 border-green-600 dark:border-green-500 text-white"
                            : "bg-card border-border"
                        )}
                        data-testid={`button-book-select-${idx}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "font-medium leading-tight",
                              isSelected ? "text-white" : "text-foreground"
                            )}>
                              {book.title}
                            </p>
                            <p className={cn(
                              "text-sm mt-1",
                              isSelected ? "text-white/80" : "text-muted-foreground"
                            )}>
                              {book.author}
                            </p>
                          </div>
                          {isSelected && (
                            <Check className="h-5 w-5 flex-shrink-0 text-white" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : !isProcessing && (
              <p className="text-center py-4 text-sm text-muted-foreground">No books identified.</p>
            )}
          </div>

          <DialogFooter className="flex sm:justify-between gap-2">
            <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddSelected} 
              disabled={isProcessing || selectedBooks.length === 0}
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Selected ({selectedBooks.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
