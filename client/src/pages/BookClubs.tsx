import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, Users, MessageCircle, UserPlus, Crown, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { BookClub, BookClubMember, BookClubMessage } from "@shared/schema";

export default function BookClubs() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<BookClub | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [newClubName, setNewClubName] = useState("");
  const [newClubDescription, setNewClubDescription] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const { data: clubs, isLoading } = useQuery<BookClub[]>({
    queryKey: ["/api/book-clubs"],
    queryFn: async () => {
      const res = await fetch("/api/book-clubs", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch clubs");
      return res.json();
    },
  });

  const { data: clubDetails, isLoading: detailsLoading } = useQuery<{ 
    club: BookClub; 
    members: BookClubMember[]; 
    messages: BookClubMessage[] 
  }>({
    queryKey: ["/api/book-clubs", selectedClub?.id],
    queryFn: async () => {
      const res = await fetch(`/api/book-clubs/${selectedClub!.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch club details");
      return res.json();
    },
    enabled: !!selectedClub,
  });

  const createClub = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const res = await apiRequest("POST", "/api/book-clubs", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/book-clubs"] });
      setCreateOpen(false);
      setNewClubName("");
      setNewClubDescription("");
      toast({ title: "Club Created", description: `Your club code is: ${data.inviteCode}` });
    },
  });

  const joinClub = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/book-clubs/join", { inviteCode: code });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/book-clubs"] });
      setJoinCode("");
      toast({ title: "Joined Club", description: "You've successfully joined the book club!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Invalid invite code or already a member.", variant: "destructive" });
    },
  });

  const sendMessage = useMutation({
    mutationFn: async (data: { clubId: number; message: string }) => {
      const res = await apiRequest("POST", `/api/book-clubs/${data.clubId}/messages`, { message: data.message });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/book-clubs", selectedClub?.id] });
      setNewMessage("");
    },
  });

  const handleSendMessage = () => {
    if (!selectedClub || !newMessage.trim()) return;
    sendMessage.mutate({ clubId: selectedClub.id, message: newMessage.trim() });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8 md:px-6 md:py-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Book Clubs</h1>
              <p className="text-muted-foreground">Connect with fellow readers and discuss your favorite books.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-join-club">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Join Club
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Join a Book Club</DialogTitle>
                  <DialogDescription>Enter the invite code to join an existing club.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="invite-code">Invite Code</Label>
                  <Input
                    id="invite-code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="Enter code..."
                    data-testid="input-invite-code"
                  />
                </div>
                <DialogFooter>
                  <Button onClick={() => joinClub.mutate(joinCode)} disabled={!joinCode || joinClub.isPending} data-testid="button-submit-join">
                    {joinClub.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-club">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Club
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create a Book Club</DialogTitle>
                  <DialogDescription>Start a new club and invite your friends.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="club-name">Club Name</Label>
                    <Input
                      id="club-name"
                      value={newClubName}
                      onChange={(e) => setNewClubName(e.target.value)}
                      placeholder="My Book Club"
                      data-testid="input-club-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="club-description">Description</Label>
                    <Textarea
                      id="club-description"
                      value={newClubDescription}
                      onChange={(e) => setNewClubDescription(e.target.value)}
                      placeholder="What books do you like to read?"
                      data-testid="input-club-description"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={() => createClub.mutate({ name: newClubName, description: newClubDescription })}
                    disabled={!newClubName || createClub.isPending}
                    data-testid="button-submit-create"
                  >
                    {createClub.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-lg font-semibold">Your Clubs</h2>
            {clubs && clubs.length > 0 ? (
              clubs.map((club) => (
                <Card
                  key={club.id}
                  className={`cursor-pointer hover-elevate ${selectedClub?.id === club.id ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setSelectedClub(club)}
                  data-testid={`card-club-${club.id}`}
                >
                  <CardHeader className="p-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{club.name}</CardTitle>
                      <Badge variant="secondary">
                        <Users className="h-3 w-3 mr-1" />
                        {club.memberCount || 1}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">{club.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center">
                  <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No clubs yet. Create or join one!</p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-2">
            {selectedClub ? (
              <Card className="h-[600px] flex flex-col">
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedClub.name}</CardTitle>
                      <CardDescription>{selectedClub.description}</CardDescription>
                    </div>
                    {selectedClub.inviteCode && (
                      <Badge variant="outline" className="font-mono">
                        Code: {selectedClub.inviteCode}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                {detailsLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <>
                    <div className="p-4 border-b">
                      <h3 className="text-sm font-medium mb-2">Members ({clubDetails?.members?.length || 0})</h3>
                      <div className="flex flex-wrap gap-2">
                        {clubDetails?.members?.map((member) => (
                          <Badge key={member.id} variant="secondary" className="flex items-center gap-1">
                            {member.role === "owner" && <Crown className="h-3 w-3 text-yellow-500" />}
                            {member.userName || "Member"}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-4">
                        {clubDetails?.messages?.length ? (
                          clubDetails.messages.map((msg) => (
                            <div key={msg.id} className="flex gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                                {msg.userName?.[0] || "?"}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{msg.userName || "Member"}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(msg.createdAt!).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-sm mt-1">{msg.message}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-muted-foreground py-8">
                            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No messages yet. Start the conversation!</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                    
                    <CardFooter className="border-t p-4">
                      <div className="flex w-full gap-2">
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type a message..."
                          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                          data-testid="input-message"
                        />
                        <Button onClick={handleSendMessage} disabled={!newMessage.trim() || sendMessage.isPending} data-testid="button-send-message">
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardFooter>
                  </>
                )}
              </Card>
            ) : (
              <Card className="h-[600px] flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">Select a Club</h3>
                  <p className="text-muted-foreground">Choose a club from the list to view discussions.</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
