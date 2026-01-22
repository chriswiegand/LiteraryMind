import { useRoute, useLocation } from "wouter";
import { useQuiz, useSubmitQuiz } from "@/hooks/use-quizzes";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, ArrowRight, CheckSquare, Circle, ToggleLeft } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

interface Question {
  type?: "true_false" | "multiple_choice" | "multiple_select";
  question: string;
  options: string[];
  correctAnswer?: number;
  correctAnswers?: number[];
}

type AnswerType = number | number[];

export default function Quiz() {
  const [, params] = useRoute("/quiz/:id");
  const [, setLocation] = useLocation();
  const id = parseInt(params?.id || "0");
  
  const { data: quiz, isLoading } = useQuiz(id);
  const submitQuiz = useSubmitQuiz();
  
  const [answers, setAnswers] = useState<AnswerType[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showResults, setShowResults] = useState(false);

  if (quiz && answers.length === 0 && !showResults) {
    if (quiz.userAnswers) {
      setAnswers(quiz.userAnswers as AnswerType[]);
      setShowResults(true);
    } else {
      const questions = quiz.questions as Question[];
      setAnswers(questions.map(q => q.type === "multiple_select" ? [] : -1));
    }
  }

  const handleSingleSelect = (optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = optionIndex;
    setAnswers(newAnswers);
  };

  const handleMultiSelect = (optionIndex: number, checked: boolean) => {
    const newAnswers = [...answers];
    const currentAnswer = (newAnswers[currentQuestion] as number[]) || [];
    if (checked) {
      newAnswers[currentQuestion] = [...currentAnswer, optionIndex].sort();
    } else {
      newAnswers[currentQuestion] = currentAnswer.filter(i => i !== optionIndex);
    }
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    const questions = quiz?.questions as Question[];
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(curr => curr + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    await submitQuiz.mutateAsync({ id, answers });
    setShowResults(true);
    if (calculateScore() >= 70) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  const calculateScore = () => {
    if (!quiz || !answers.length) return 0;
    const questions = quiz.questions as Question[];
    let correctCount = 0;
    
    questions.forEach((q, idx) => {
      const userAnswer = answers[idx];
      if (q.type === "multiple_select") {
        const correctSet = new Set(q.correctAnswers || []);
        const userSet = new Set(userAnswer as number[]);
        if (correctSet.size === userSet.size && [...correctSet].every(x => userSet.has(x))) {
          correctCount++;
        }
      } else {
        if (userAnswer === q.correctAnswer) {
          correctCount++;
        }
      }
    });
    
    return Math.round((correctCount / questions.length) * 100);
  };

  const isAnswerCorrect = (question: Question, userAnswer: AnswerType): boolean => {
    if (question.type === "multiple_select") {
      const correctSet = new Set(question.correctAnswers || []);
      const userSet = new Set(userAnswer as number[]);
      return correctSet.size === userSet.size && [...correctSet].every(x => userSet.has(x));
    }
    return userAnswer === question.correctAnswer;
  };

  const isCurrentAnswerValid = () => {
    if (!quiz) return false;
    const questions = quiz.questions as Question[];
    const question = questions[currentQuestion];
    const answer = answers[currentQuestion];
    
    if (question.type === "multiple_select") {
      return (answer as number[]).length > 0;
    }
    return answer !== -1;
  };

  const getQuestionTypeIcon = (type?: string) => {
    switch (type) {
      case "true_false":
        return <ToggleLeft className="h-4 w-4" />;
      case "multiple_select":
        return <CheckSquare className="h-4 w-4" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  const getQuestionTypeLabel = (type?: string) => {
    switch (type) {
      case "true_false":
        return "True/False";
      case "multiple_select":
        return "Select All";
      default:
        return "Multiple Choice";
    }
  };

  if (isLoading) return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (!quiz) return null;

  const questions = quiz.questions as Question[];
  const question = questions[currentQuestion];
  const isLastQuestion = currentQuestion === questions.length - 1;
  const score = calculateScore();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8 md:px-6 md:py-12 max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-display font-bold">Book Quiz</h1>
          <p className="text-muted-foreground mt-2">Test your knowledge with {questions.length} questions</p>
        </div>

        {showResults ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8"
          >
            <Card className="bg-card border-border shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="mb-6">
                  <div className={`text-6xl font-bold font-display mb-2 ${score >= 70 ? 'text-green-600' : 'text-orange-500'}`}>
                    {score}%
                  </div>
                  <p className="text-muted-foreground">
                    You answered {Math.round((score / 100) * questions.length)} out of {questions.length} correctly.
                  </p>
                </div>
                
                <div className="flex justify-center gap-4">
                  <Button onClick={() => setLocation("/")} variant="outline" data-testid="button-back-library">
                    Back to Library
                  </Button>
                  {score < 100 && (
                    <Button onClick={() => window.location.reload()} data-testid="button-retake">
                      Retake Quiz
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="text-xl font-bold font-display">Review Answers</h3>
              {questions.map((q, idx) => {
                const userAnswer = answers[idx];
                const correct = isAnswerCorrect(q, userAnswer);
                
                return (
                  <Card key={idx} className={`border-l-4 ${correct ? 'border-l-green-500' : 'border-l-red-500'}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="secondary" className="text-xs">
                          {getQuestionTypeIcon(q.type)}
                          <span className="ml-1">{getQuestionTypeLabel(q.type)}</span>
                        </Badge>
                      </div>
                      <p className="font-semibold mb-3">{idx + 1}. {q.question}</p>
                      <div className="space-y-2 text-sm">
                        {q.options.map((opt: string, optIdx: number) => {
                          const isCorrectOption = q.type === "multiple_select" 
                            ? q.correctAnswers?.includes(optIdx)
                            : optIdx === q.correctAnswer;
                          const isUserSelected = q.type === "multiple_select"
                            ? (userAnswer as number[])?.includes(optIdx)
                            : userAnswer === optIdx;
                          
                          return (
                            <div key={optIdx} className="flex items-center gap-2">
                              {isCorrectOption ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                              ) : isUserSelected ? (
                                <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                              ) : (
                                <div className="w-4 h-4" />
                              )}
                              <span className={`
                                ${isCorrectOption ? 'text-green-700 font-medium' : ''}
                                ${isUserSelected && !isCorrectOption ? 'text-red-600 line-through opacity-75' : ''}
                              `}>
                                {opt}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center text-sm font-medium text-muted-foreground mb-4">
              <span>Question {currentQuestion + 1} of {questions.length}</span>
              <span>{Math.round(((currentQuestion) / questions.length) * 100)}% Complete</span>
            </div>
            
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${((currentQuestion) / questions.length) * 100}%` }}
              />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="border-border/60 shadow-md">
                  <CardContent className="p-6 md:p-8">
                    <div className="flex items-center gap-2 mb-4">
                      <Badge variant="secondary">
                        {getQuestionTypeIcon(question.type)}
                        <span className="ml-1">{getQuestionTypeLabel(question.type)}</span>
                      </Badge>
                      {question.type === "multiple_select" && (
                        <span className="text-xs text-muted-foreground">(Select all that apply)</span>
                      )}
                    </div>
                    
                    <h2 className="text-xl md:text-2xl font-bold font-display mb-8">
                      {question.question}
                    </h2>

                    {question.type === "multiple_select" ? (
                      <div className="space-y-3">
                        {question.options.map((option: string, index: number) => {
                          const isChecked = ((answers[currentQuestion] as number[]) || []).includes(index);
                          return (
                            <div 
                              key={index} 
                              className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                isChecked ? 'border-primary bg-primary/5' : 'border-border/50 hover:bg-secondary/50'
                              }`}
                              onClick={() => handleMultiSelect(index, !isChecked)}
                              data-testid={`option-${index}`}
                            >
                              <Checkbox 
                                checked={isChecked}
                                onCheckedChange={(checked) => handleMultiSelect(index, checked as boolean)}
                                id={`opt-${index}`}
                              />
                              <Label htmlFor={`opt-${index}`} className="flex-1 cursor-pointer font-medium">
                                {option}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <RadioGroup 
                        value={answers[currentQuestion]?.toString()} 
                        onValueChange={(val) => handleSingleSelect(parseInt(val))}
                        className="space-y-3"
                      >
                        {question.options.map((option: string, index: number) => (
                          <div key={index} className="flex items-center space-x-2">
                            <RadioGroupItem value={index.toString()} id={`opt-${index}`} className="peer sr-only" />
                            <Label 
                              htmlFor={`opt-${index}`}
                              className="flex-1 p-4 rounded-lg border-2 border-border/50 peer-aria-checked:border-primary peer-aria-checked:bg-primary/5 cursor-pointer hover:bg-secondary/50 transition-all font-medium text-base"
                              data-testid={`option-${index}`}
                            >
                              <span className="w-6 h-6 rounded-full border border-primary/20 mr-3 inline-flex items-center justify-center text-xs">
                                {question.type === "true_false" ? (index === 0 ? "T" : "F") : String.fromCharCode(65 + index)}
                              </span>
                              {option}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>

            <div className="flex justify-end pt-4">
              <Button 
                size="lg" 
                onClick={handleNext} 
                disabled={!isCurrentAnswerValid() || submitQuiz.isPending}
                className="w-full md:w-auto px-8"
                data-testid="button-next"
              >
                {submitQuiz.isPending ? (
                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isLastQuestion ? (
                  "Submit Quiz"
                ) : (
                  <>Next Question <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
