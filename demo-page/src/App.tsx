import { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

function App() {
  const [dynamicMessage, setDynamicMessage] = useState<string | null>(null);
  const [apiData, setApiData] = useState<unknown>(null);

  useEffect(() => {
    fetch("/data/example.json")
      .then((response) => response.json())
      .then((json) => setApiData(json))
      .catch((error) => {
        console.error("Failed to fetch example.json", error);
      });
  }, []);

  function handleLoadDynamicModule() {
    import("./dynamic-module")
      .then((mod) => {
        setDynamicMessage(mod.dynamicValue);
      })
      .catch((error) => {
        console.error("Failed to dynamically import module", error);
      });
  }

  return (
    <>
      <div>
        <img src={viteLogo} className="logo" alt="Vite logo" />
        <img src={reactLogo} className="logo react" alt="React logo" />
      </div>
      <h1>Resource Hash Extension Demo</h1>

      <section className="api-info">
        <h2>Browser APIs Used for Detection</h2>
        <p className="intro">
          The extension uses these Web APIs to discover and hash all loaded
          resources on a page.
        </p>

        <div className="api-grid">
          <div className="api-card">
            <div className="api-card-header">
              <span className="api-icon">👁️</span>
              <h3>PerformanceObserver</h3>
            </div>
            <p className="api-description">
              Watches for new resources loaded at runtime. Fires when dynamic
              imports, fetch requests, or lazy-loaded assets complete.
            </p>
            <a
              href="https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver"
              target="_blank"
              rel="noopener noreferrer"
              className="mdn-link"
            >
              MDN Reference →
            </a>
          </div>

          <div className="api-card">
            <div className="api-card-header">
              <span className="api-icon">📊</span>
              <h3>performance.getEntriesByType</h3>
            </div>
            <p className="api-description">
              Returns all resources loaded since page start. Used for initial
              scan to capture JS, CSS, images, fonts, and XHR/fetch requests.
            </p>
            <a
              href="https://developer.mozilla.org/en-US/docs/Web/API/Performance/getEntriesByType"
              target="_blank"
              rel="noopener noreferrer"
              className="mdn-link"
            >
              MDN Reference →
            </a>
          </div>

          <div className="api-card">
            <div className="api-card-header">
              <span className="api-icon">🔍</span>
              <h3>document.querySelectorAll</h3>
            </div>
            <p className="api-description">
              Scans the DOM for <code>&lt;img src&gt;</code> and{" "}
              <code>&lt;link rel="icon"&gt;</code> elements to find directly
              referenced assets.
            </p>
            <a
              href="https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelectorAll"
              target="_blank"
              rel="noopener noreferrer"
              className="mdn-link"
            >
              MDN Reference →
            </a>
          </div>

          <div className="api-card">
            <div className="api-card-header">
              <span className="api-icon">🔐</span>
              <h3>crypto.subtle.digest</h3>
            </div>
            <p className="api-description">
              Computes SHA-256 hash of each resource's bytes. Used to create a
              tamper-proof fingerprint of each file.
            </p>
            <a
              href="https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest"
              target="_blank"
              rel="noopener noreferrer"
              className="mdn-link"
            >
              MDN Reference →
            </a>
          </div>

          <div className="api-card">
            <div className="api-card-header">
              <span className="api-icon">📦</span>
              <h3>chrome.storage.local</h3>
            </div>
            <p className="api-description">
              Stores the manifest so the popup UI can read it. Persists across
              popup open/close and updates in real-time.
            </p>
            <a
              href="https://developer.chrome.com/docs/extensions/reference/api/storage"
              target="_blank"
              rel="noopener noreferrer"
              className="mdn-link"
            >
              Chrome API Reference →
            </a>
          </div>

          <div className="api-card">
            <div className="api-card-header">
              <span className="api-icon">📡</span>
              <h3>chrome.runtime.onMessage</h3>
            </div>
            <p className="api-description">
              Enables communication between popup and content script. Used when
              clicking "Refresh" to re-scan the page.
            </p>
            <a
              href="https://developer.chrome.com/docs/extensions/reference/api/runtime#event-onMessage"
              target="_blank"
              rel="noopener noreferrer"
              className="mdn-link"
            >
              Chrome API Reference →
            </a>
          </div>
        </div>
      </section>

      <section className="edge-cases">
        <h2>Edge Cases for Resource Detection</h2>
        <p className="intro">
          These examples demonstrate resources that are <strong>only</strong>{" "}
          discoverable via the Resource Timing API, not simple DOM queries and
          make use of above APIs.
        </p>

        <ul className="case-list">
          <li className="case-item">
            <div className="case-header">
              <span className="case-number">1</span>
              <h3>CSS Background Image</h3>
            </div>
            <p className="case-description">
              The box below uses <code>background-image: url(...)</code> in CSS.
              There is no <code>&lt;img&gt;</code> tag in the DOM, so{" "}
              <code>querySelectorAll("img")</code> won't find it.
            </p>
            <div className="background-box" />
          </li>

          <li className="case-item">
            <div className="case-header">
              <span className="case-number">2</span>
              <h3>Dynamic JS Import (Code Splitting)</h3>
            </div>
            <p className="case-description">
              Clicking the button triggers{" "}
              <code>import("./dynamic-module")</code>. Vite creates a separate
              chunk that loads on demand. No <code>&lt;script&gt;</code> tag
              exists until you click.
            </p>
            <button className="action-btn" onClick={handleLoadDynamicModule}>
              Load Dynamic Module
            </button>
            {dynamicMessage && (
              <p className="result-message">Module says: {dynamicMessage}</p>
            )}
          </li>

          <li className="case-item">
            <div className="case-header">
              <span className="case-number">3</span>
              <h3>Runtime Fetch (JSON API)</h3>
            </div>
            <p className="case-description">
              This JSON is fetched via <code>fetch("/data/example.json")</code>{" "}
              in a <code>useEffect</code>. It's never referenced in HTML—only
              loaded at runtime via JavaScript.
            </p>
            <pre className="api-data">
              {apiData ? JSON.stringify(apiData, null, 2) : "Loading..."}
            </pre>
          </li>
        </ul>
      </section>
    </>
  );
}

export default App;
