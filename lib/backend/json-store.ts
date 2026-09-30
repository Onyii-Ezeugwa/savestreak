import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DataStore } from "./store";
import type { ConsentRecord, GoalRecord, UserRecord } from "./types";

interface Snapshot {
  users: UserRecord[];
  consents: ConsentRecord[];
  goals: GoalRecord[];
}

export class JsonStore implements DataStore {
  private snapshot: Snapshot = { users: [], consents: [], goals: [] };
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async init() {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Snapshot;
      this.snapshot = {
        users: parsed.users ?? [],
        consents: parsed.consents ?? [],
        goals: parsed.goals ?? [],
      };
    } catch {
      await this.persist();
    }
  }

  private persist() {
    this.writeQueue = this.writeQueue.then(() =>
      writeFile(this.filePath, JSON.stringify(this.snapshot, null, 2)),
    );
    return this.writeQueue;
  }

  async getUserByEmail(email: string) {
    return (
      this.snapshot.users.find((user) => user.email === email.toLowerCase()) ??
      null
    );
  }

  async getUserById(id: string) {
    return this.snapshot.users.find((user) => user.id === id) ?? null;
  }

  async createUser(user: UserRecord) {
    this.snapshot.users.push(user);
    await this.persist();
    return user;
  }

  async updateUser(user: UserRecord) {
    this.snapshot.users = this.snapshot.users.map((current) =>
      current.id === user.id ? user : current,
    );
    await this.persist();
    return user;
  }

  async createConsent(consent: ConsentRecord) {
    this.snapshot.consents.push(consent);
    await this.persist();
    return consent;
  }

  async getConsentByToken(token: string) {
    return this.snapshot.consents.find((item) => item.token === token) ?? null;
  }

  async getConsentByUserId(userId: string) {
    return this.snapshot.consents.find((item) => item.userId === userId) ?? null;
  }

  async updateConsent(consent: ConsentRecord) {
    this.snapshot.consents = this.snapshot.consents.map((item) =>
      item.id === consent.id ? consent : item,
    );
    await this.persist();
    return consent;
  }

  async listGoals(userId: string) {
    return this.snapshot.goals
      .filter((goal) => goal.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getGoal(id: string, userId: string) {
    return (
      this.snapshot.goals.find(
        (goal) => goal.id === id && goal.userId === userId,
      ) ?? null
    );
  }

  async createGoal(goal: GoalRecord) {
    this.snapshot.goals.push(goal);
    await this.persist();
    return goal;
  }

  async updateGoal(goal: GoalRecord) {
    this.snapshot.goals = this.snapshot.goals.map((item) =>
      item.id === goal.id ? goal : item,
    );
    await this.persist();
    return goal;
  }

  async deleteGoal(id: string, userId: string) {
    const before = this.snapshot.goals.length;
    this.snapshot.goals = this.snapshot.goals.filter(
      (goal) => !(goal.id === id && goal.userId === userId),
    );
    await this.persist();
    return this.snapshot.goals.length < before;
  }
}
