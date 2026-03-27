import { PublicClientApplication, type AccountInfo } from "@azure/msal-browser";

let msalInstanceSingleton: PublicClientApplication | null = null;
let msalInitPromise: Promise<void> | null = null;

export function getTeamsMsalInstance() {
  if (typeof window === "undefined") return null;
  if (msalInstanceSingleton) return msalInstanceSingleton;

  const isLocalhost = window.location.hostname === "localhost";

  const msalConfig = {
    auth: {
      // NOTE: Copied from legacy portal for strict parity.
      clientId: "7236b395-5b60-49b1-9cf3-9d2a27b9c413",
      authority: "https://login.microsoftonline.com/c3f5fa7c-ed63-45cf-add7-e1af66326703",
      // In Next.js we keep redirect on the Teams page.
      redirectUri: isLocalhost ? `${window.location.origin}/admin/teams` : `${window.location.origin}/admin/teams`,
    },
    cache: {
      cacheLocation: "localStorage" as const,
      storeAuthStateInCookie: false,
    },
  };

  msalInstanceSingleton = new PublicClientApplication(msalConfig);
  return msalInstanceSingleton;
}

export async function ensureTeamsMsalInitialized() {
  const msal = getTeamsMsalInstance();
  if (!msal) return;
  if (!msalInitPromise) {
    // MSAL v3+ requires initialize() before any auth calls.
    msalInitPromise = msal.initialize().then(() => undefined);
  }
  await msalInitPromise;
}

export async function handleTeamsRedirect() {
  const msal = getTeamsMsalInstance();
  if (!msal) return null;
  await ensureTeamsMsalInitialized();
  try {
    const res = await msal.handleRedirectPromise();
    const accounts = msal.getAllAccounts();
    if (res?.account) msal.setActiveAccount(res.account);
    else if (accounts.length > 0) msal.setActiveAccount(accounts[0]);
    return msal.getActiveAccount();
  } catch {
    return msal.getActiveAccount();
  }
}

export function getActiveTeamsAccount(): AccountInfo | null {
  const msal = getTeamsMsalInstance();
  return msal ? msal.getActiveAccount() : null;
}

