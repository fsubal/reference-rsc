import { Suspense, type ReactNode } from "react";
import { Counter, Location, NoteForm } from "./components";
import {
  getRequestURL,
  getRouteParams,
  type PageContext,
} from "../framework/context";
import "./style.css";

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{`${title} · Reference RSC`}</title>
      </head>
      <body>
        <div className="shell">
          <header>
            <a className="brand" href="/">
              reference<span> / RSC</span>
            </a>
            <span className="badge">PROTOTYPE 01</span>
          </header>
          <nav aria-label="メイン">
            <a href="/">Overview</a>
            <a href="/about">Design</a>
            <a href="/notes">Notes demo</a>
          </nav>
          <main>{children}</main>
          <footer>
            <span>
              現在の URL <Location />
            </span>
            <Counter />
          </footer>
        </div>
      </body>
    </html>
  );
}
export function Home() {
  return (
    <Shell title="Overview">
      <p className="eyebrow">REACT FOR READING. HTTP FOR WRITING.</p>
      <h1>
        表示を、
        <br />
        <em>シンプルに。</em>
      </h1>
      <p className="lead">
        Server Components の表現力と、明示的な HTTP API。
        <br />
        その間を、小さなフレームワークでつなぐ。
      </p>
      <div className="cards">
        <article>
          <span>01 / SERVER</span>
          <h2>Hono が URL を解決</h2>
          <p>ルート定義はサーバーにひとつ。HTML と Flight は同じ URL から。</p>
        </article>
        <article>
          <span>02 / BROWSER</span>
          <h2>リンクは、そのまま</h2>
          <p>
            Navigation API
            が通常のリンクを捕捉。非対応環境では通常のページ遷移。
          </p>
        </article>
        <article>
          <span>03 / MUTATION</span>
          <h2>更新は fetch で</h2>
          <p>API へ明示的にリクエスト。refresh() で表示を更新します。</p>
        </article>
      </div>
      <a className="primary-link" href="/notes">
        メモのデモを試す →
      </a>
    </Shell>
  );
}
export function About() {
  return (
    <Shell title="Design">
      <p className="eyebrow">DESIGN PRINCIPLES</p>
      <h1>責務を小さく。</h1>
      <p className="lead">
        React がサーバーとブラウザをまたいで担うのは、表示のための仕事です。
      </p>
      <ol className="principles">
        <li>Server Components でデータを取得し、HTML / Flight を生成。</li>
        <li>Client Components で操作を受け取り、HTTP API に更新を依頼。</li>
        <li>
          ルートの一致判定と認証は Hono。独自のクライアントルーターは持たない。
        </li>
        <li>Server Functions はビルド時に拒否。RPC の実行経路を設けない。</li>
      </ol>
      <p>このページと Overview は SSG にも対応しています。</p>
      <a href="/">← Overview</a>
    </Shell>
  );
}
async function notes() {
  const data = await import.meta.viteRsc.loadModule<
    typeof import("../entry.ssr")
  >("ssr", "index");
  return data.readNotes();
}
export async function Notes() {
  const items = await notes();
  return (
    <Shell title="Notes">
      <p className="eyebrow">EXPLICIT HTTP API DEMO</p>
      <h1>読んで、書いて。</h1>
      <p className="lead">
        この一覧は Server Component。追加は Client Component の fetch です。
      </p>
      <ul className="notes">
        {items.map((note) => (
          <li key={note.id}>
            <a href={`/notes/${note.id}`}>{note.text}</a>
            <span>#{note.id}</span>
          </li>
        ))}
      </ul>
      <NoteForm />
      <p className="muted">
        メモはサーバーのメモリに保存され、再起動時に消えます。
      </p>
    </Shell>
  );
}
export async function Note({ params }: PageContext) {
  const item = (await notes()).find((note) => note.id === params.id);
  return (
    <Shell title={`Note ${params.id}`}>
      <p className="eyebrow">ROUTE PARAMS</p>
      <h1>Note {params.id}</h1>
      <p className="lead">{item?.text ?? "このメモはありません。"}</p>
      <DeepContext />
      <a href="/notes">← メモ一覧</a>
    </Shell>
  );
}
async function DeepContext() {
  await new Promise((resolve) => setTimeout(resolve, 10));
  return (
    <p data-testid="context">
      深い Server Component: {getRequestURL().pathname} / id=
      {getRouteParams().id}
    </p>
  );
}
export function Missing() {
  return (
    <Shell title="Not Found">
      <h1>404</h1>
      <p>ページが見つかりませんでした。</p>
      <a href="/">Overview に戻る</a>
    </Shell>
  );
}
async function Delayed() {
  await new Promise((resolve) =>
    setTimeout(
      resolve,
      Math.min(Number(getRequestURL().searchParams.get("ms")) || 100, 2000),
    ),
  );
  return <DeepContext />;
}
export function Slow() {
  return (
    <Shell title="Streaming">
      <h1>Streaming</h1>
      <Suspense fallback={<p>読み込み中…</p>}>
        <Delayed />
      </Suspense>
    </Shell>
  );
}
