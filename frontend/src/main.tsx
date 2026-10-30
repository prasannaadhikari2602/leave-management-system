import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { store } from "./app/store";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
        <Toaster position="top-right" toastOptions={{ style: { background: "#06112e", color: "#fff", fontSize: "14px" } }} />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
