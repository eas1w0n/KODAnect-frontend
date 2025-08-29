import "@/shared/styles/index.css";
import "react-toastify/dist/ReactToastify.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes/router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ToastContainer } from "react-toastify";

import { worker } from "@/mocks/browser";

const queryClient = new QueryClient();

function renderApp() {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <ToastContainer
          position="top-center"
          autoClose={1500}
          closeOnClick
          pauseOnHover
          draggable
        />
        {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </StrictMode>,
  );
}

function startMSW() {
  // 브라우저/서비스워커 사용 가능한 환경에서만 실행
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve();
  }
  return worker.start({
    serviceWorker: { url: "/mockServiceWorker.js" },
    onUnhandledRequest: "bypass",
  });
}

//Top-level await 없이 순서 보장: MSW 시작 후 무조건 렌더
startMSW().catch(console.error).finally(renderApp);
