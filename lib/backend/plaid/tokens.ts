import { randomBytes, randomUUID } from "node:crypto";

export interface LinkTokenSession {
  linkToken: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

export interface PublicTokenSession {
  publicToken: string;
  userId: string;
  institutionId: string;
  institutionName: string;
  institutionCity: string;
  institutionState: string;
  domain: string;
  createdAt: number;
  expiresAt: number;
  consumed: boolean;
}

export interface AccessTokenItem {
  accessToken: string;
  itemId: string;
  userId: string;
  institutionId: string;
  institutionName: string;
  institutionCity: string;
  institutionState: string;
  domain: string;
}

const LINK_TTL_MS = 4 * 60 * 60 * 1000;
const PUBLIC_TTL_MS = 30 * 60 * 1000;

const globalForPlaid = globalThis as typeof globalThis & {
  savestreakPlaidLinkTokens?: Map<string, LinkTokenSession>;
  savestreakPlaidPublicTokens?: Map<string, PublicTokenSession>;
  savestreakPlaidAccessTokens?: Map<string, AccessTokenItem>;
};

function linkTokens() {
  if (!globalForPlaid.savestreakPlaidLinkTokens) {
    globalForPlaid.savestreakPlaidLinkTokens = new Map();
  }
  return globalForPlaid.savestreakPlaidLinkTokens;
}

function publicTokens() {
  if (!globalForPlaid.savestreakPlaidPublicTokens) {
    globalForPlaid.savestreakPlaidPublicTokens = new Map();
  }
  return globalForPlaid.savestreakPlaidPublicTokens;
}

function accessTokens() {
  if (!globalForPlaid.savestreakPlaidAccessTokens) {
    globalForPlaid.savestreakPlaidAccessTokens = new Map();
  }
  return globalForPlaid.savestreakPlaidAccessTokens;
}

function mint(prefix: string) {
  return `${prefix}-${randomBytes(18).toString("hex")}`;
}

export function createLinkToken(userId: string) {
  const now = Date.now();
  const session: LinkTokenSession = {
    linkToken: mint("link-sandbox"),
    userId,
    createdAt: now,
    expiresAt: now + LINK_TTL_MS,
  };
  linkTokens().set(session.linkToken, session);
  return {
    link_token: session.linkToken,
    expiration: new Date(session.expiresAt).toISOString(),
  };
}

export function getLinkToken(linkToken: string) {
  const session = linkTokens().get(linkToken);
  if (!session) {
    return null;
  }
  if (session.expiresAt < Date.now()) {
    linkTokens().delete(linkToken);
    return null;
  }
  return session;
}

export function createPublicToken(input: {
  userId: string;
  institutionId: string;
  institutionName: string;
  institutionCity: string;
  institutionState: string;
  domain: string;
}) {
  const now = Date.now();
  const session: PublicTokenSession = {
    publicToken: mint("public-sandbox"),
    userId: input.userId,
    institutionId: input.institutionId,
    institutionName: input.institutionName,
    institutionCity: input.institutionCity,
    institutionState: input.institutionState,
    domain: input.domain,
    createdAt: now,
    expiresAt: now + PUBLIC_TTL_MS,
    consumed: false,
  };
  publicTokens().set(session.publicToken, session);
  return session;
}

export function exchangePublicToken(publicToken: string, userId: string) {
  const session = publicTokens().get(publicToken);
  if (!session || session.userId !== userId) {
    return null;
  }
  if (session.expiresAt < Date.now() || session.consumed) {
    publicTokens().delete(publicToken);
    return null;
  }

  session.consumed = true;
  publicTokens().delete(publicToken);

  const item: AccessTokenItem = {
    accessToken: mint("access-sandbox"),
    itemId: `item-${randomUUID()}`,
    userId,
    institutionId: session.institutionId,
    institutionName: session.institutionName,
    institutionCity: session.institutionCity,
    institutionState: session.institutionState,
    domain: session.domain,
  };
  accessTokens().set(item.accessToken, item);
  return item;
}

export function getAccessTokenItem(accessToken: string) {
  return accessTokens().get(accessToken) ?? null;
}

export function rememberAccessToken(item: AccessTokenItem) {
  accessTokens().set(item.accessToken, item);
}
