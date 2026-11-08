import path from "node:path";
import { AuthService, toPublicUser } from "./auth-service";
import { BankService } from "./bank-service";
import { ConsentService } from "./consent-service";
import { ExpenseService } from "./expense-service";
import { GoalsService } from "./goals-service";
import { JsonStore } from "./json-store";
import { PostgresStore } from "./postgres-store";
import type { DataStore } from "./store";
import { createServerSupabase } from "@/lib/supabase/server";
import { SupabaseStore } from "./supabase-store";
import { ApiError } from "./types";

const STORE_VERSION = 9;

const globalForBackend = globalThis as typeof globalThis & {
  savestreakStore?: DataStore;
  savestreakStoreReady?: Promise<DataStore>;
  savestreakStoreVersion?: number;
};

async function createStore(): Promise<DataStore> {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return SupabaseStore.connect();
  }

  if (process.env.DATABASE_URL) {
    return PostgresStore.connect(process.env.DATABASE_URL);
  }

  const filePath = path.join(process.cwd(), ".data", "store.json");
  const store = new JsonStore(filePath);
  await store.init();
  return store;
}

function storeIsCurrent(store: DataStore | undefined) {
  return Boolean(
    store &&
      globalForBackend.savestreakStoreVersion === STORE_VERSION &&
      typeof store.listBankAccounts === "function" &&
      typeof store.listExpenses === "function" &&
      typeof store.listStatementTransactions === "function" &&
      typeof store.claimPasswordReset === "function" &&
      typeof store.listGoalChanges === "function" &&
      typeof store.countConsentResends === "function",
  );
}

export async function getStore() {
  if (storeIsCurrent(globalForBackend.savestreakStore)) {
    return globalForBackend.savestreakStore!;
  }

  // A store can be saved under the current version before its class gained
  // the newest methods. Reusing that promise keeps the stale instance.
  if (
    globalForBackend.savestreakStoreReady &&
    !globalForBackend.savestreakStore
  ) {
    return globalForBackend.savestreakStoreReady;
  }

  globalForBackend.savestreakStore = undefined;
  globalForBackend.savestreakStoreVersion = STORE_VERSION;
  const pending = createStore().then((store) => {
    if (globalForBackend.savestreakStoreReady === pending) {
      globalForBackend.savestreakStore = store;
      globalForBackend.savestreakStoreVersion = STORE_VERSION;
    }
    return store;
  });
  globalForBackend.savestreakStoreReady = pending;
  return pending;
}

export async function getServices() {
  const store = await getStore();
  return {
    store,
    auth: new AuthService(store),
    consent: new ConsentService(store),
    goals: new GoalsService(store),
    banks: new BankService(store),
    expenses: new ExpenseService(store),
  };
}

export async function requireUserRecord() {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new ApiError(401, "Log in to continue.");
  }
  if (!data.user.email_confirmed_at) {
    throw new ApiError(
      403,
      "Confirm your email before continuing. Check your inbox for the $aveStreak link.",
    );
  }
  const { store } = await getServices();
  const record = await store.getUserById(data.user.id);
  if (!record) {
    throw new ApiError(401, "Log in to continue.");
  }
  return record;
}

export { toPublicUser };
