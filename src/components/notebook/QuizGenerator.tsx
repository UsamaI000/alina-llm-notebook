import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BrainCircuit, CheckCircle2, XCircle, RefreshCw, ArrowLeft, Loader2, BookOpen, ArrowRight, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuizGeneration } from '@/hooks/useQuizGeneration';

interface QuizGeneratorProps {
  notebookId?: string;
  onBack: () => void;
}

const QuizGenerator = ({ notebookId, onBack }: QuizGeneratorProps) => {
  const { 
    generateQuiz, 
    isGenerating, 
    quizData, 
    generationStatus 
  } = useQuizGeneration(notebookId);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const { toast } = useToast();

  // Reset state when new data arrives
  useEffect(() => {
    if (quizData) {
      setCurrentQuestionIndex(0);
      setScore(0);
      setIsAnswerRevealed(false);
      setSelectedOption(null);
    }
  }, [quizData]);

  // --- Event Handlers ---

  const handleOptionSelect = (key: string, correctAnswer: string) => {
    if (isAnswerRevealed) return;
    
    setSelectedOption(key);
    setIsAnswerRevealed(true);
    
    // Case-insensitive comparison (e.g., "B" === "b")
    if (String(key).toLowerCase() === String(correctAnswer).toLowerCase()) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (!quizData) return;
    
    if (currentQuestionIndex < quizData.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
    } else {
        toast({
            title: "Quiz Completed!",
            description: `You scored ${score} out of ${quizData.length}`,
        });
    }
  };

  // --- Render States ---

  if (isGenerating || generationStatus === 'generating') {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="p-4 border-b border-gray-200 flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <h3 className="font-medium text-gray-900">Generating Quiz...</h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
           <div className="relative">
             <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-20"></div>
             <Loader2 className="h-12 w-12 text-emerald-600 animate-spin mb-4 relative z-10" />
           </div>
           <h3 className="text-lg font-medium text-gray-900 mb-2">Designing your quiz</h3>
           <p className="text-gray-500 text-sm max-w-xs">
             Alina is analyzing your documents to create relevant questions...
           </p>
        </div>
      </div>
    );
  }

  if (!quizData || quizData.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <h3 className="font-medium text-gray-900">Quiz Generator</h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-white">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
            <BrainCircuit className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Test your knowledge</h3>
          <p className="text-sm text-gray-500 mb-8 max-w-xs mx-auto">
            Generate an interactive quiz based on the sources in this notebook to reinforce your learning.
          </p>
          <Button 
            onClick={() => generateQuiz()} 
            disabled={isGenerating}
            className="bg-emerald-600 hover:bg-emerald-700 text-white w-full max-w-xs h-11 text-sm shadow-emerald-200 shadow-lg"
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Generate Quiz
          </Button>
        </div>
      </div>
    );
  }

  // --- Active Question Data Safety Check ---
  
  // Access the current question object safely
  const rawQuestion = quizData[currentQuestionIndex] as any;
  
  // Normalize Data: Handle different field names (question vs text, correct_answer vs correctAnswer)
  const questionText = rawQuestion.question || rawQuestion.text || "Question text missing";
  const correctAnswer = rawQuestion.correct_answer || rawQuestion.correctAnswer || "";
  const explanation = rawQuestion.explanation || "No explanation provided.";
  const options = rawQuestion.options || {};

  // Safety check: If options is missing or invalid, don't crash
  if (!options || (typeof options !== 'object')) {
    console.error("Invalid options format:", options);
    return (
        <div className="p-8 text-center text-red-500">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>Error loading question options. Please regenerate the quiz.</p>
            <Button variant="outline" onClick={() => generateQuiz()} className="mt-4">Regenerate</Button>
        </div>
    );
  }

  // Determine how to map options (Array vs Object)
  // Your JSON is an Object: { "A": "Text", "B": "Text" }
  // Use Object.entries to convert it to an array of [key, value] for mapping
  const optionsList = Array.isArray(options) 
    ? options.map((val, idx) => ({ key: String(idx), value: val })) // Fallback for arrays
    : Object.entries(options).map(([key, value]) => ({ key, value: String(value) }));

  const isLastQuestion = currentQuestionIndex === quizData.length - 1;
  const progress = ((currentQuestionIndex + 1) / quizData.length) * 100;

  return (
    <div className="h-full flex flex-col bg-gray-50">
        <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium text-gray-700 text-sm">Question {currentQuestionIndex + 1} of {quizData.length}</span>
            </div>
            <div className="flex items-center gap-3">
                 <Button variant="ghost" size="sm" onClick={() => generateQuiz()} className="h-8 text-xs text-gray-500 hover:text-emerald-600">
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> New
                 </Button>
                <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
                    Score: {score}
                </div>
            </div>
        </div>
        
        <div className="w-full bg-gray-100 h-1">
            <div className="bg-emerald-500 h-1 transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
        </div>

        <ScrollArea className="flex-1 p-4">
            <div className="max-w-lg mx-auto space-y-6 pb-10 mt-4">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-medium text-gray-900 leading-relaxed">
                        {questionText}
                    </h3>
                </div>

                <div className="space-y-3">
                    {optionsList.map(({ key, value }) => {
                        const isSelected = selectedOption === key;
                        // Check correctness case-insensitively
                        const isCorrect = String(key).toLowerCase() === String(correctAnswer).toLowerCase();
                        
                        const showCorrect = isAnswerRevealed && isCorrect;
                        const showIncorrect = isAnswerRevealed && isSelected && !isCorrect;

                        let borderClass = "border-gray-200 hover:border-blue-300 hover:bg-blue-50/30";
                        let bgClass = "bg-white";
                        let textClass = "text-gray-700";
                        let icon = <div className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-xs font-medium text-gray-500">{key}</div>;

                        if (showCorrect) {
                            borderClass = "border-emerald-500 ring-1 ring-emerald-500";
                            bgClass = "bg-emerald-50";
                            textClass = "text-emerald-900 font-medium";
                            icon = <CheckCircle2 className="h-6 w-6 text-emerald-600" />;
                        } else if (showIncorrect) {
                            borderClass = "border-red-300 bg-red-50";
                            bgClass = "bg-red-50";
                            textClass = "text-red-900";
                            icon = <XCircle className="h-6 w-6 text-red-500" />;
                        } else if (isSelected) {
                            borderClass = "border-blue-500 ring-1 ring-blue-500";
                            bgClass = "bg-blue-50";
                            textClass = "text-blue-900";
                            icon = <div className="w-6 h-6 rounded-full border-2 border-blue-500 bg-white flex items-center justify-center text-xs font-bold text-blue-600">{key}</div>;
                        }

                        return (
                            <Card
                                key={key}
                                onClick={() => handleOptionSelect(key, correctAnswer)}
                                className={`p-4 cursor-pointer transition-all duration-200 relative overflow-hidden ${borderClass} ${bgClass}`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 flex-shrink-0">
                                        {icon}
                                    </div>
                                    <span className={`text-sm leading-relaxed ${textClass}`}>{value}</span>
                                </div>
                            </Card>
                        );
                    })}
                </div>

                {isAnswerRevealed && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
                        <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 mb-6">
                            <div className="flex items-start gap-3">
                                <div className="bg-blue-100 p-1.5 rounded-md">
                                    <BookOpen className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                    <span className="font-semibold text-blue-900 text-sm block mb-1">Explanation</span>
                                    <p className="text-sm text-blue-800 leading-relaxed">{explanation}</p>
                                </div>
                            </div>
                        </div>
                        
                        <Button 
                            onClick={handleNext} 
                            className="w-full h-12 text-base bg-gray-900 hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl"
                        >
                            {isLastQuestion ? 'Finish Quiz' : 'Next Question'} <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
        </ScrollArea>
    </div>
  );
};

export default QuizGenerator;