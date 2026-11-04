"use client";

import { useEffect } from "react";
import { startLog } from "../lib/preLog.js";

// Everything animated touches window and WebGL, so it loads only in the browser.
export default function Experience() {
  useEffect(() => {
    const live = startLog();
    import("../lib/main.js").then((m) => m.boot(live));
  }, []);
  return null;
}
