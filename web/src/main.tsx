import React from "react";
import ReactDOM from "react-dom/client";

import { registerServiceWorker } from "@/lib/pwa";
const Page = React.lazy(() =>
  /^\/demo\/(golf|hotel|campus|city)\/?$/.test(window.location.pathname)
    ? import("@/pages/GeoDemo")
    : window.location.pathname.replace(/\/$/, "") === "/tech"
      ? import("@/pages/TechPage")
      : import("@/app/App").then((module) => ({ default: module.App })),
);
registerServiceWorker();
import "@/styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <React.Suspense
      fallback={
        <p role="status" style={{ padding: 24 }}>
          Открываем карту…
        </p>
      }
    >
      <Page />
    </React.Suspense>
  </React.StrictMode>,
);
