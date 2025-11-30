import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// Get the root HTML element
const rootElement = document.getElementById("root");

// Throw error if root element is missing
if (!rootElement) {
  throw new Error("Root element with id 'root' not found");
}

// Create the React root
const root = ReactDOM.createRoot(rootElement);

// Render the app inside BrowserRouter
// BrowserRouter enables URL based navigation
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
