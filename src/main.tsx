import "@fontsource/raleway/400.css";
import "@fontsource/raleway/700.css";
import "@fontsource/passion-one/400.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { IntlProvider } from "use-intl";
import { App } from "./App";
import messages from "./messages/en.json";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <IntlProvider locale="en" messages={messages}>
      <App />
    </IntlProvider>
  </StrictMode>,
);
