import assert from "node:assert/strict";
import { test } from "node:test";

import { markdownToHtml } from "../extension/markdown-html.js";
import { topicToMarkdown } from "../extension/markdown.js";
import { groupNotes } from "../extension/store.js";

test("escapes text instead of emitting raw HTML", () => {
  const html = markdownToHtml(`a < b & c > d "e" 'f'\n\n<script>alert(1)</script>`);
  assert.equal(
    html,
    [
      "<p>a &lt; b &amp; c &gt; d &quot;e&quot; &#39;f&#39;</p>",
      "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>",
    ].join("\n"),
  );
  assert.equal(html.includes("<script>"), false);
});

test("renders headings and paragraphs", () => {
  const html = markdownToHtml("# Title\n\n## Section\n\n### Key terms\n\nHello\nworld");
  assert.equal(
    html,
    [
      "<h1>Title</h1>",
      "<h2>Section</h2>",
      "<h3>Key terms</h3>",
      "<p>Hello world</p>",
    ].join("\n"),
  );
  assert.equal(markdownToHtml("###### Deep"), "<h6>Deep</h6>");
  assert.equal(markdownToHtml("# <em>nope</em>"), "<h1>&lt;em&gt;nope&lt;/em&gt;</h1>");
});

test("renders unordered and ordered lists with inline bold", () => {
  const html = markdownToHtml(
    [
      "### Key terms",
      "- **Glucose:** A sugar.",
      "- *italic* term",
      "",
      "### Review questions",
      "1. What is stored?",
      "2. Where?",
    ].join("\n"),
  );
  assert.equal(
    html,
    [
      "<h3>Key terms</h3>",
      "<ul>",
      "<li><strong>Glucose:</strong> A sugar.</li>",
      "<li><em>italic</em> term</li>",
      "</ul>",
      "<h3>Review questions</h3>",
      "<ol>",
      "<li>What is stored?</li>",
      "<li>Where?</li>",
      "</ol>",
    ].join("\n"),
  );
});

test("renders bold, italic, and inline code with escaping", () => {
  assert.equal(
    markdownToHtml("**bold** and *italic* and _also_ and `a<b>&c`"),
    "<p><strong>bold</strong> and <em>italic</em> and <em>also</em> and <code>a&lt;b&gt;&amp;c</code></p>",
  );
  assert.equal(markdownToHtml("`**not bold**`"), "<p><code>**not bold**</code></p>");
  assert.equal(markdownToHtml("snake_case_name"), "<p>snake_case_name</p>");
  assert.equal(markdownToHtml("**<img alt=\"x\">**"), "<p><strong>&lt;img alt=&quot;x&quot;&gt;</strong></p>");
});

test("keeps http and https links and escapes the href", () => {
  assert.equal(
    markdownToHtml("[Source](https://docs.example.com/course/module/early)"),
    '<p><a href="https://docs.example.com/course/module/early">Source</a></p>',
  );
  assert.equal(
    markdownToHtml("[q](http://example.com/a?b=1&c=2)"),
    '<p><a href="http://example.com/a?b=1&amp;c=2">q</a></p>',
  );
  assert.equal(
    markdownToHtml("[**docs**](https://example.com/path)"),
    '<p><a href="https://example.com/path"><strong>docs</strong></a></p>',
  );
  assert.equal(
    markdownToHtml('[<b>x</b>](https://example.com)'),
    '<p><a href="https://example.com/">&lt;b&gt;x&lt;/b&gt;</a></p>',
  );
});

test("drops javascript and other non-http URLs", () => {
  const cases = [
    "[click me](javascript:alert(1))",
    "[click me](JavaScript:alert(1))",
    "[click me](javascript://example.com/%0Aalert(1))",
    "[click me](data:text/html,hi)",
    "[click me](vbscript:msgbox(1))",
    "[click me](file:///etc/passwd)",
    "[click me](//evil.example/phish)",
    "[click me](javascript:alert(1))",
  ];
  for (const markdown of cases) {
    const html = markdownToHtml(`See ${markdown} now.`);
    assert.equal(html, "<p>See click me now.</p>", markdown);
    assert.equal(html.includes("<a"), false, markdown);
    assert.equal(/javascript:|data:|vbscript:|file:/i.test(html), false, markdown);
  }
  assert.equal(
    markdownToHtml('<a href="javascript:alert(1)">x</a>'),
    "<p>&lt;a href=&quot;javascript:alert(1)&quot;&gt;x&lt;/a&gt;</p>",
  );
});

test("topic markdown keeps the source URL as a link", () => {
  const [group] = groupNotes([
    {
      id: "early",
      topicKey: "docs.example.com/course/module",
      topicTitle: "course / module",
      url: "https://docs.example.com/course/module/early",
      title: "Early page",
      mode: "study",
      markdown: "Early summary.\n\n- **Glucose:** A sugar.",
      createdAt: "2026-10-23T12:00:00.000Z",
    },
  ]);
  const html = markdownToHtml(topicToMarkdown(group));
  assert.match(html, /<h1>course \/ module<\/h1>/);
  assert.match(html, /<h2>Early page<\/h2>/);
  assert.match(
    html,
    /<a href="https:\/\/docs\.example\.com\/course\/module\/early">Source<\/a>/,
  );
  assert.match(html, /<strong>Glucose:<\/strong>/);
  assert.equal(html.includes("javascript:"), false);
});

test("empty markdown produces no html", () => {
  assert.equal(markdownToHtml(""), "");
  assert.equal(markdownToHtml("   \n\n"), "");
  assert.equal(markdownToHtml(null), "");
});
