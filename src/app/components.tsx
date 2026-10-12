"use client";
import { useEffect, useState, type SubmitEvent } from "react";
import { refresh, useLocation } from "../framework/client";

function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

export function Counter() {
  const hydrated = useHydrated();
  const [count, setCount] = useState(0);
  return (
    <button disabled={!hydrated} onClick={() => setCount(count + 1)}>
      Client count: {count}
    </button>
  );
}

export function Location() {
  const url = useLocation();
  return (
    <code data-testid="location">
      {url.pathname}
      {url.search}
    </code>
  );
}

export function NoteForm() {
  const hydrated = useHydrated();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const text = new FormData(form).get("text");
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) {
        throw new Error((await response.json()).error);
      }
      await refresh();
      form.reset();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <label htmlFor="note">新しいメモ</label>
      <div className="input-row">
        <input
          id="note"
          name="text"
          required
          maxLength={200}
          disabled={!hydrated || busy}
          placeholder="RSC でつくりたいもの"
        />
        <button disabled={!hydrated || busy}>
          {busy ? "保存中…" : "追加する"}
        </button>
      </div>
      <p role="status">{error}</p>
    </form>
  );
}
