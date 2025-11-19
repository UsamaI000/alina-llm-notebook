import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MoreVertical, Plus, Edit, Bot, User, Loader2, AlertCircle, CheckCircle2, RefreshCw, Headphones, FileQuestion, Sparkles, BrainCircuit } from 'lucide-react';
import { useNotes, Note } from '@/hooks/useNotes';
import { useAudioOverview } from '@/hooks/useAudioOverview';
import { useNotebooks } from '@/hooks/useNotebooks';
import { useSources } from '@/hooks/useSources';
import { useQueryClient } from '@tanstack/react-query';
import NoteEditor from './NoteEditor';
import AudioPlayer from './AudioPlayer';
import { Citation } from '@/types/message';
import { useToast } from '@/hooks/use-toast';

interface StudioSidebarProps {
  notebookId?: string;
  isExpanded?: boolean;
  onCitationClick?: (citation: Citation) => void;
}

const StudioSidebar = ({
  notebookId,
  isExpanded,
  onCitationClick
}: StudioSidebarProps) => {
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const { toast } = useToast();
  
  const {
    notes,
    isLoading,
    createNote,
    updateNote,
    deleteNote,
    isCreating,
    isUpdating,
    isDeleting
  } = useNotes(notebookId);
  
  const {
    notebooks
  } = useNotebooks();
  
  const {
    sources
  } = useSources(notebookId);
  
  const {
    generateAudioOverview,
    refreshAudioUrl,
    autoRefreshIfExpired,
    isGenerating,
    isAutoRefreshing,
    generationStatus,
    checkAudioExpiry
  } = useAudioOverview(notebookId);
  
  const queryClient = useQueryClient();
  const notebook = notebooks?.find(n => n.id === notebookId);
  const hasValidAudio = notebook?.audio_overview_url && !checkAudioExpiry(notebook.audio_url_expires_at);
  const currentStatus = generationStatus || notebook?.audio_overview_generation_status;
  
  // Check if at least one source has been successfully processed
  const hasProcessedSource = sources?.some(source => source.processing_status === 'completed') || false;

  // Auto-refresh expired URLs
  useEffect(() => {
    if (!notebookId || !notebook?.audio_overview_url) return;
    
    const checkAndRefresh = async () => {
      if (checkAudioExpiry(notebook.audio_url_expires_at)) {
        console.log('Detected expired audio URL, initiating auto-refresh...');
        await autoRefreshIfExpired(notebookId, notebook.audio_url_expires_at);
      }
    };

    // Check immediately
    checkAndRefresh();

    // Set up periodic check every 5 minutes
    const interval = setInterval(checkAndRefresh, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [notebookId, notebook?.audio_overview_url, notebook?.audio_url_expires_at, autoRefreshIfExpired, checkAudioExpiry]);

  const handleCreateNote = () => {
    setIsCreatingNote(true);
    setEditingNote(null);
  };

  const handleEditNote = (note: Note) => {
    console.log('StudioSidebar: Opening note', {
      noteId: note.id,
      sourceType: note.source_type
    });
    setEditingNote(note);
    setIsCreatingNote(false);
  };

  const handleSaveNote = (title: string, content: string) => {
    if (editingNote) {
      // Only allow updating user notes, not AI responses
      if (editingNote.source_type === 'user') {
        updateNote({
          id: editingNote.id,
          title,
          content
        });
      }
    } else {
      createNote({
        title,
        content,
        source_type: 'user'
      });
    }
    setEditingNote(null);
    setIsCreatingNote(false);
  };

  const handleDeleteNote = () => {
    if (editingNote) {
      deleteNote(editingNote.id);
      setEditingNote(null);
    }
  };

  const handleCancel = () => {
    setEditingNote(null);
    setIsCreatingNote(false);
  };

  const handleGenerateAudio = () => {
    if (notebookId) {
      generateAudioOverview(notebookId);
      setAudioError(false);
    }
  };

  const handleQuizClick = () => {
    toast({
      title: "Quiz Generation",
      description: "This feature is coming soon!",
    });
  };

  const handleAudioError = () => {
    setAudioError(true);
  };

  const handleAudioRetry = () => {
    // Regenerate the audio overview
    handleGenerateAudio();
  };

  const handleAudioDeleted = () => {
    // Refresh the notebooks data to update the UI
    if (notebookId) {
      queryClient.invalidateQueries({
        queryKey: ['notebooks']
      });
    }
    setAudioError(false);
  };

  const handleUrlRefresh = (notebookId: string) => {
    refreshAudioUrl(notebookId);
  };

  const isEditingMode = editingNote || isCreatingNote;
  const getPreviewText = (note: Note) => {
    if (note.source_type === 'ai_response') {
      // Use extracted_text if available, otherwise parse the content
      if (note.extracted_text) {
        return note.extracted_text;
      }
      try {
        const parsed = JSON.parse(note.content);
        if (parsed.segments && parsed.segments[0]) {
          return parsed.segments[0].text;
        }
      } catch (e) {
        // If parsing fails, use content as-is
      }
    }

    // For user notes or fallback, use the content directly
    const contentToUse = note.content;
    return contentToUse.length > 100 ? contentToUse.substring(0, 100) + '...' : contentToUse;
  };

  if (isEditingMode) {
    return <div className="w-full bg-gray-50 border-l border-gray-200 flex flex-col h-full overflow-hidden">
        <NoteEditor note={editingNote || undefined} onSave={handleSaveNote} onDelete={editingNote ? handleDeleteNote : undefined} onCancel={handleCancel} isLoading={isCreating || isUpdating || isDeleting} onCitationClick={onCitationClick} />
      </div>;
  }

  return <div className="w-full bg-gray-50 border-l border-gray-200 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Studio</h2>
        
        {/* Studio Actions Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Audio Overview Card */}
          <Card 
            className={`p-3 cursor-pointer transition-all hover:shadow-md border relative overflow-hidden group ${
                hasValidAudio ? 'bg-purple-50 border-purple-200' : 'bg-white hover:border-purple-200 border-gray-200'
            }`}
            onClick={hasValidAudio || currentStatus === 'generating' ? undefined : handleGenerateAudio}
          >
              <div className="flex flex-col h-full justify-between space-y-3">
                  <div className="flex justify-between items-start">
                      {/* Beautiful Gradient Icon Container */}
                      <div className={`p-2.5 rounded-xl shadow-sm ${
                          hasValidAudio 
                            ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white' 
                            : 'bg-gradient-to-br from-purple-500 to-indigo-500 text-white opacity-90 group-hover:opacity-100 transition-opacity'
                      }`}>
                           {isGenerating || currentStatus === 'generating' ? (
                               <Loader2 className="h-5 w-5 animate-spin text-white" />
                           ) : (
                               <Headphones className="h-5 w-5 text-white" />
                           )}
                      </div>
                      {hasValidAudio && <CheckCircle2 className="h-4 w-4 text-purple-600" />}
                  </div>
                  <div>
                      <h3 className="font-medium text-sm text-gray-900">Audio Overview</h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                          {isGenerating || currentStatus === 'generating' 
                              ? 'Generating...' 
                              : hasValidAudio 
                                  ? 'Ready to play' 
                                  : 'Generate audio'}
                      </p>
                  </div>
              </div>
          </Card>

          {/* Quiz Generation Card */}
          <Card 
            className="p-3 cursor-pointer transition-all hover:shadow-md border bg-white hover:border-emerald-200 border-gray-200 group"
            onClick={handleQuizClick}
          >
              <div className="flex flex-col h-full justify-between space-y-3">
                  <div className="flex justify-between items-start">
                      {/* Beautiful Gradient Icon Container */}
                      <div className="p-2.5 rounded-xl shadow-sm bg-gradient-to-br from-emerald-500 to-teal-600 text-white opacity-90 group-hover:opacity-100 transition-opacity">
                          <BrainCircuit className="h-5 w-5 text-white" />
                      </div>
                  </div>
                  <div>
                      <h3 className="font-medium text-sm text-gray-900">Quiz</h3>
                      <p className="text-xs text-gray-500 mt-1">Test your knowledge</p>
                  </div>
              </div>
          </Card>
        </div>

        {/* Audio Player / Error Display */}
        <div className="mb-4">
            {/* Error State */}
            {(audioError || currentStatus === 'failed') && (
                 <Card className="p-3 border-red-200 bg-red-50 mb-3">
                    <div className="flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <div className="flex-1">
                            <p className="text-sm text-red-600 font-medium">Audio Generation Failed</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={handleAudioRetry} className="text-red-600 border-red-300 hover:bg-red-50 h-7">
                            <RefreshCw className="h-3 w-3 mr-1" /> Retry
                        </Button>
                    </div>
                 </Card>
            )}

            {/* Player */}
            {hasValidAudio && !audioError && currentStatus !== 'generating' && !isAutoRefreshing && (
                <AudioPlayer 
                  audioUrl={notebook.audio_overview_url} 
                  title="Deep Dive Conversation" 
                  notebookId={notebookId} 
                  expiresAt={notebook.audio_url_expires_at} 
                  onError={handleAudioError} 
                  onRetry={handleAudioRetry} 
                  onDeleted={handleAudioDeleted}
                  onUrlRefresh={handleUrlRefresh}
                />
            )}
            
            {/* Auto Refreshing State */}
            {isAutoRefreshing && (
              <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg border border-blue-100">
                <Loader2 className="h-4 w-4 text-blue-600 animate-spin mr-2" />
                <span className="text-sm text-blue-600">Refreshing audio...</span>
              </div>
            )}
        </div>

        {/* Notes Section Header */}
        <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">Notes</h3>
        </div>
          
        <Button variant="outline" size="sm" className="w-full mb-4" onClick={handleCreateNote}>
            <Plus className="h-4 w-4 mr-2" />
            Add note
        </Button>
      </div>

      {/* Saved Notes Area */}
      <ScrollArea className="flex-1 h-full">
        <div className="p-4">
          {isLoading ? <div className="text-center py-8">
              <p className="text-sm text-gray-600">Loading notes...</p>
            </div> : notes && notes.length > 0 ? <div className="space-y-3">
              {notes.map(note => <Card key={note.id} className="p-3 border border-gray-200 hover:bg-gray-50 cursor-pointer" onClick={() => handleEditNote(note)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        {note.source_type === 'ai_response' ? <Bot className="h-3 w-3 text-blue-600" /> : <User className="h-3 w-3 text-gray-600" />}
                        <span className="text-xs text-gray-500 uppercase">
                          {note.source_type === 'ai_response' ? 'AI Response' : 'Note'}
                        </span>
                      </div>
                      <h4 className="font-medium text-gray-900 truncate">{note.title}</h4>
                      <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                        {getPreviewText(note)}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(note.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    {note.source_type === 'user' && <Button variant="ghost" size="sm" className="ml-2">
                        <Edit className="h-3 w-3" />
                      </Button>}
                  </div>
                </Card>)}
            </div> : <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-200 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <span className="text-gray-400 text-2xl">📄</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Saved notes will appear here</h3>
              <p className="text-sm text-gray-600">
                Save a chat message to create a new note, or click Add note above.
              </p>
            </div>}
        </div>
      </ScrollArea>
    </div>;
};

export default StudioSidebar;