export function decideSend({
  manual = false,
  consent = false,
  hasKey = false,
  autoEnabled = false,
  paused = false,
  alreadyToday = false,
  extraction = null,
}) {
  if (!consent) {
    return {
      ok: false,
      code: "consent",
      message:
        "Open options and confirm the notice before AutoNote can send page text to Gemini.",
    };
  }
  if (!hasKey) {
    return {
      ok: false,
      code: "key",
      message: "Add a Gemini API key in options before generating a note.",
    };
  }
  if (!extraction || extraction.status !== "ok") {
    return {
      ok: false,
      code: "skipped",
      message: extraction?.reason || "This page can't be read.",
    };
  }
  if (!manual) {
    if (!autoEnabled) {
      return { ok: false, code: "auto-off", message: "Auto notes are off." };
    }
    if (paused) {
      return { ok: false, code: "paused", message: "Auto notes are paused." };
    }
    if (alreadyToday) {
      return {
        ok: false,
        code: "duplicate",
        message: "A note for this page was already saved today.",
      };
    }
  }
  return { ok: true, code: "send", message: "" };
}
