import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface QuizQuestion {
  id: number;
  question: string;
  options: Record<string, string>;
  correct_answer: string;
  explanation: string;
}

export interface Quiz {
  id: string;
  status: 'generating' | 'completed' | 'failed';
  questions: QuizQuestion[] | null;
  created_at: string;
  score?: number;
  title?: string; // <--- Added title field
}

export const useQuizGeneration = (notebookId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 1. Fetch All Quizzes
  const { data: quizzes, isLoading: isLoadingQuizzes } = useQuery({
    queryKey: ['quizzes', notebookId],
    queryFn: async () => {
      if (!notebookId) return [];
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('notebook_id', notebookId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as Quiz[];
    },
    enabled: !!notebookId,
  });

  // 2. Real-time Subscription
  useEffect(() => {
    if (!notebookId) return;
    const channel = supabase
      .channel('quiz-list-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quizzes', filter: `notebook_id=eq.${notebookId}` }, 
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['quizzes', notebookId] });
          const newData = payload.new as Quiz;
          // Only show toast for NEW completions (not renames/score updates)
          if (payload.eventType === 'UPDATE' && newData.status === 'completed' && 
              (payload.old as Quiz)?.status !== 'completed') {
            toast({ title: "Quiz Ready!", description: "A new quiz has been generated." });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [notebookId, queryClient, toast]);

  // 3. Mutation: Generate
  const generateQuiz = useMutation({
    mutationFn: async (questionCount: number = 5) => {
      if (!notebookId) throw new Error("No notebook ID");
      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: { notebook_id: notebookId, no_of_questions: questionCount }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quizzes', notebookId] }); },
    onError: (error) => { 
      console.error('Quiz generation failed:', error);
      toast({ title: "Error", description: "Failed to start quiz generation.", variant: "destructive" });
    }
  });

  // 4. Mutation: Save Score
  const saveScore = useMutation({
    mutationFn: async ({ quizId, score }: { quizId: string, score: number }) => {
      const { error } = await supabase.from('quizzes').update({ score: score }).eq('id', quizId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quizzes', notebookId] }); },
    onError: (error) => { toast({ title: "Error", description: "Failed to save score.", variant: "destructive" }); }
  });

  // 5. NEW: Rename Quiz
  const renameQuiz = useMutation({
    mutationFn: async ({ quizId, title }: { quizId: string, title: string }) => {
      const { error } = await supabase.from('quizzes').update({ title }).eq('id', quizId);
      if (error) throw error;
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['quizzes', notebookId] }); 
      toast({ title: "Success", description: "Quiz renamed successfully." });
    },
    onError: () => { toast({ title: "Error", description: "Failed to rename quiz.", variant: "destructive" }); }
  });

  // 6. NEW: Delete Quiz
  const deleteQuiz = useMutation({
    mutationFn: async (quizId: string) => {
      const { error } = await supabase.from('quizzes').delete().eq('id', quizId);
      if (error) throw error;
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['quizzes', notebookId] }); 
      toast({ title: "Deleted", description: "Quiz deleted successfully." });
    },
    onError: () => { toast({ title: "Error", description: "Failed to delete quiz.", variant: "destructive" }); }
  });

  return {
    quizzes: quizzes || [],
    isLoadingQuizzes,
    generateQuiz: generateQuiz.mutate,
    isGenerating: generateQuiz.isPending,
    saveScore: saveScore.mutate,
    renameQuiz: renameQuiz.mutate,
    deleteQuiz: deleteQuiz.mutate
  };
};