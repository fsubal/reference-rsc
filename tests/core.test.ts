import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoServerFunctions } from "../src/framework/guard";
import {
  withRequest,
  getRequestURL,
  getRouteParams,
} from "../src/framework/context";
import { shouldIntercept, wantsFlight } from "../src/framework/protocol";
import { handleApi } from "../src/app/api";

for (const source of [
  '"use server"; export async function run() {}',
  'export async function run() { "use server"; }',
  'const run = async () => { "use strict"; "use server"; };',
  'class A { async run() { "use server"; } }',
]) {
  test(`reject directive: ${source}`, () => {
    assert.throws(
      () => assertNoServerFunctions(source, "fixture.tsx"),
      /Server Functions are disabled/,
    );
  });
}

for (const source of [
  '"use client"; export const Widget = () => <div />;',
  '// "use server"\nconst text = "use server";',
  "export async function Page() { return <p>hello</p>; }",
]) {
  test(`allow source: ${source}`, () => {
    assert.doesNotThrow(() => assertNoServerFunctions(source, "fixture.tsx"));
  });
}

test("request contexts remain isolated across async work and URL mutation", async () => {
  await Promise.all(
    ["a", "b", "c"].map((id) =>
      withRequest(
        { url: new URL(`https://example.test/${id}`), params: { id } },
        async () => {
          getRequestURL().pathname = "/changed";
          await new Promise((resolve) => setTimeout(resolve, 5));
          assert.equal(getRequestURL().pathname, `/${id}`);
          assert.equal(getRouteParams().id, id);
        },
      ),
    ),
  );

  assert.throws(getRequestURL, /only available/);
});

test("Flight requires the explicit non-zero media type", () => {
  const accepts = (accept: string) =>
    wantsFlight(new Request("https://example.test", { headers: { accept } }));

  assert.equal(accepts("text/x-component"), true);
  assert.equal(accepts("text/html, text/x-component;q=0.8"), true);
  assert.equal(accepts("text/x-component;q=0"), false);
  assert.equal(accepts("text/html"), false);
});

test("navigation excludes forms, hashes, downloads, APIs and external origins", () => {
  const event = {
    canIntercept: true,
    hashChange: false,
    downloadRequest: null,
    formData: null,
    destination: { url: "https://example.test/about" },
  };

  assert.equal(shouldIntercept(event, "https://example.test/"), true);

  for (const patch of [
    { canIntercept: false },
    { hashChange: true },
    { downloadRequest: "" },
    { formData: new FormData() },
    { destination: { url: "https://elsewhere.test/" } },
    { destination: { url: "https://example.test/api/notes" } },
  ]) {
    assert.equal(
      shouldIntercept({ ...event, ...patch }, "https://example.test/"),
      false,
    );
  }
});

test("API validates origin, media type, body shape and length", async () => {
  const request = (body: string, headers = {}) =>
    handleApi(
      new Request("https://example.test/api/notes", {
        method: "POST",
        body,
        headers,
      }),
    );

  assert.equal((await request("{}")).status, 403);
  assert.equal(
    (await request("{}", { Origin: "https://evil.test" })).status,
    403,
  );
  assert.equal(
    (await request("{}", { Origin: "https://example.test" })).status,
    415,
  );
  const headers = {
    Origin: "https://example.test",
    "Content-Type": "application/json",
  };

  for (const body of [
    "null",
    "{",
    "{}",
    '{"text":""}',
    JSON.stringify({ text: "x".repeat(201) }),
  ]) {
    assert.equal((await request(body, headers)).status, 400);
  }

  assert.equal(
    (await request(JSON.stringify({ text: "x".repeat(5000) }), headers)).status,
    413,
  );

  assert.equal((await request('{"text":"valid"}', headers)).status, 201);
});
