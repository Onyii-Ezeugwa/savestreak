import { randomUUID } from "node:crypto";
import { requireActiveAccount } from "./goals-service";
import {
  LESSON_QUIZZES,
  QUIZ_VERSION,
  quizForLesson,
  scoreQuiz,
  type LessonQuiz,
} from "./lesson-quizzes";
import type { LessonQuizAttemptRecord } from "./habit-types";
import type { DataStore } from "./store";
import { ApiError, type UserRecord } from "./types";

function quizRows() {
  return LESSON_QUIZZES.map((quiz) => ({
    id: quiz.id,
    lessonId: quiz.lessonId,
    topics: quiz.topics,
    passPercent: quiz.passPercent,
    questions: quiz.questions.map((question, index) => ({
      id: question.id,
      position: index + 1,
      prompt: question.prompt,
      choices: question.choices,
      correctIndex: question.correctIndex,
      explanation: question.explanation,
    })),
  }));
}

export async function ensureLessonQuizzes(store: DataStore) {
  const bag = globalThis as { savestreakQuizVersion?: string };
  if (bag.savestreakQuizVersion === QUIZ_VERSION) {
    return;
  }
  await store.saveLessonQuizzes(quizRows());
  bag.savestreakQuizVersion = QUIZ_VERSION;
}

function percent(score: number, total: number) {
  return total === 0 ? 0 : Math.round((score / total) * 100);
}

function toAttempt(attempt: LessonQuizAttemptRecord) {
  return {
    id: attempt.id,
    score: attempt.score,
    total: attempt.total,
    percent: percent(attempt.score, attempt.total),
    passed: attempt.passed,
    createdAt: attempt.createdAt,
  };
}

function toReview(quiz: LessonQuiz, attempt: LessonQuizAttemptRecord) {
  return {
    ...toAttempt(attempt),
    questions: quiz.questions.map((question, index) => ({
      prompt: question.prompt,
      choices: question.choices,
      selected: attempt.answers[index] ?? -1,
      correctIndex: question.correctIndex,
      explanation: question.explanation,
    })),
  };
}

async function present(store: DataStore, userId: string, lessonId: string, quiz: LessonQuiz) {
  const attempts = await store.listLessonQuizAttempts(userId, lessonId);
  const latest = attempts[0] ?? null;
  return {
    quizId: quiz.id,
    passPercent: quiz.passPercent,
    completed: attempts.some((attempt) => attempt.passed),
    questions: quiz.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      choices: question.choices,
    })),
    attempts: attempts.map(toAttempt),
    review: latest ? toReview(quiz, latest) : null,
  };
}

async function lessonQuiz(store: DataStore, user: UserRecord, lessonId: string) {
  requireActiveAccount(user);
  await ensureLessonQuizzes(store);
  const lessons = await store.listLessons();
  const lesson = lessons.find((item) => item.id === lessonId);
  if (!lesson) {
    throw new ApiError(404, "That lesson was not found.");
  }
  return { user, lesson, quiz: quizForLesson(lesson) };
}

export async function readLessonQuiz(store: DataStore, user: UserRecord, lessonId: string) {
  const loaded = await lessonQuiz(store, user, lessonId);
  return present(store, loaded.user.id, lessonId, loaded.quiz);
}

export async function submitLessonQuiz(
  store: DataStore,
  user: UserRecord,
  lessonId: string,
  answers: unknown,
) {
  const loaded = await lessonQuiz(store, user, lessonId);
  const previous = await store.listLessonQuizAttempts(user.id, lessonId);
  if (previous.some((attempt) => attempt.passed)) {
    throw new ApiError(400, "This lesson is already complete.");
  }
  const quiz = loaded.quiz;
  if (
    !Array.isArray(answers) ||
    answers.length !== quiz.questions.length ||
    answers.some(
      (answer, index) =>
        !Number.isInteger(answer) ||
        answer < 0 ||
        answer >= quiz.questions[index]!.choices.length,
    )
  ) {
    throw new ApiError(400, "Answer every question.");
  }
  const chosen = answers as number[];
  const result = scoreQuiz(
    quiz.questions.map((question) => question.correctIndex),
    chosen,
    quiz.passPercent,
  );
  await store.createLessonQuizAttempt({
    id: randomUUID(),
    userId: user.id,
    lessonId,
    quizId: quiz.id,
    score: result.score,
    total: result.total,
    passed: result.passed,
    answers: chosen,
    createdAt: new Date().toISOString(),
  });
  return present(store, user.id, lessonId, quiz);
}
