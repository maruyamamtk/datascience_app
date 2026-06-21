"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { TermRecord } from "@/lib/content/types";

/**
 * 用語 registry をクライアントに供給する Context（状態層）。
 * サーバ側 loader（lib/content/terms.ts）が読んだ TermRecord を受け取り、
 * 配下の `<Term>` がポップオーバー描画に使う（single source of truth）。
 */
const TermsContext = createContext<TermRecord>({});

export function TermsProvider({ terms, children }: { terms: TermRecord; children: ReactNode }) {
  return <TermsContext.Provider value={terms}>{children}</TermsContext.Provider>;
}

export function useTerms(): TermRecord {
  return useContext(TermsContext);
}
