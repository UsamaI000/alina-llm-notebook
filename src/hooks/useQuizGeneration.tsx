import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface QuizQuestion {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number; // Index of the correct option (0-3)
  explanation: string;
}

export const useQuizGeneration = (notebookId?: string) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [quizData, setQuizData] = useState<QuizQuestion[] | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 1. Fetch existing quiz data on load
  useEffect(() => {
    if (!notebookId) return;

    const fetchQuizData = async () => {
      const result = await supabase
        .from('notebooks')
        .select('quiz_data, quiz_generation_status')
        .eq('id', notebookId)
        .single();

      if (result.error) {
        console.error('Failed to fetch quiz data:', result.error);
        return;
      }

      const data = result.data as
        | { quiz_data?: unknown; quiz_generation_status?: string }
        | null;

      if (data) {
        if (data.quiz_data) {
          // Ensure the JSONB data matches our TypeScript interface
          setQuizData(data.quiz_data as unknown as QuizQuestion[]);
        }
        setGenerationStatus(data.quiz_generation_status ?? null);
        
        // If status says generating but page just loaded, ensure spinner is on
        if (data.quiz_generation_status === 'generating') {
          setIsGenerating(true);
        }
      }
    };

    fetchQuizData();
  }, [notebookId]);

  // 2. Real-time subscription for updates
  useEffect(() => {
    if (!notebookId) return;

    const channel = supabase
      .channel('notebook-quiz-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notebooks',
          filter: `id=eq.${notebookId}`
        },
        (payload) => {
          const newData = payload.new as any;
          
          if (newData.quiz_generation_status) {
            setGenerationStatus(newData.quiz_generation_status);
            
            // Status: Completed
            if (newData.quiz_generation_status === 'completed' && newData.quiz_data) {
              setIsGenerating(false);
              setQuizData(newData.quiz_data);
              toast({
                title: "Quiz Ready!",
                description: "Your study quiz has been generated.",
              });
              queryClient.invalidateQueries({ queryKey: ['notebooks'] });
            } 
            // Status: Failed
            else if (newData.quiz_generation_status === 'failed') {
              setIsGenerating(false);
              toast({
                title: "Generation Failed",
                description: "Failed to generate quiz. Please try again.",
                variant: "destructive",
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [notebookId, toast, queryClient]);

  // 3. Mutation to trigger generation
  const generateQuiz = useMutation({
    mutationFn: async () => {
      if (!notebookId) throw new Error("No notebook ID");
      
      setIsGenerating(true);
      setGenerationStatus('generating');
      setQuizData(null); // Clear old quiz data while regenerating
      
      // This calls your new 'generate-quiz' Edge Function
      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: { 
            notebookId,
            no_of_questions: 5
         }
      });

      if (error) throw error;
      return data;
    },
    onError: (error) => {
      console.error('Quiz generation failed to start:', error);
      setIsGenerating(false);
      setGenerationStatus(null);
      
      toast({
        title: "Error",
        description: "Failed to start quiz generation. Check your connection.",
        variant: "destructive",
      });
    }
  });

  return {
    generateQuiz: generateQuiz.mutate,
    isGenerating: isGenerating || generateQuiz.isPending,
    generationStatus,
    quizData
  };
};