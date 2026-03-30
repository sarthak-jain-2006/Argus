import { useState } from "react";
import PlanGraph from "./components/PlanGraph";

function App() {
  const [tableName, setTableName] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [plan, setPlan] = useState<any | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"exact" | "approx">("exact");
  const [source, setSource] = useState<"duckdb" | "postgres" | "mysql">(
    "duckdb",
  );
  const [suggestedQueries, setSuggestedQueries] = useState<string[]>([]);

  const backend = "http://127.0.0.1:8093";
  const csvMode = tableName !== null;

  const getEffectiveSource = (): "duckdb" | "postgres" | "mysql" => {
    if (csvMode) {
      return "duckdb";
    }
    return source;
  };

  // -----------------------
  // Upload CSV Handler
  // -----------------------
  const handleUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const form = new FormData();
    form.append("file", file);

    const res = await fetch(`${backend}/api/upload`, {
      method: "POST",
      body: form,
    });

    const data = await res.json();

    if (!data.table_name) {
      alert("Upload failed");
      return;
    }

    const tbl = data.table_name;
    setTableName(tbl);
    setSource("duckdb");
    setMode("exact");

    setSuggestedQueries([
      `SELECT * FROM ${tbl} LIMIT 5;`,
      `SELECT COUNT(*) FROM ${tbl};`,
      `SELECT AVG(salary) FROM ${tbl};`,
    ]);
  };

  // -----------------------
  // Analyze SQL Plan
  // -----------------------
  const handleAnalyze = async () => {
    if (!query.trim()) return;
    setError(null);
    const effectiveSource = getEffectiveSource();

    const res = await fetch(`${backend}/api/sql/parse-plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, source: effectiveSource }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data?.detail || "Failed to analyze query");
      return;
    }
    setPlan(data.plan_tree ?? null);
  };

  // -----------------------
  // Execute SQL Query
  // -----------------------
  const handleExecute = async () => {
    if (!query.trim()) return;
    setError(null);
    const effectiveSource = getEffectiveSource();

    const res = await fetch(`${backend}/api/sql/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, mode, source: effectiveSource }),
    });

    const data = await res.json();
    if (!res.ok) {
      setResult(null);
      setError(data?.detail || "Query execution failed");
      return;
    }
    setResult(data);
  };

  return (
    <div
      style={{
        padding: "20px",
        color: "white",
        background: "#1e1e1e",
        minHeight: "100vh",
      }}
    >
      <h1>Query Executor Workspace</h1>

      {/* ---------------- Upload CSV ---------------- */}
      <div style={{ marginTop: "20px", marginBottom: "20px" }}>
        <label style={{ fontSize: "16px", fontWeight: "bold" }}>
          Upload CSV File:
        </label>
        <br />
        <input
          type="file"
          onChange={handleUpload}
          style={{
            marginTop: "10px",
            padding: "5px",
            border: "1px solid #555",
            background: "#333",
            color: "white",
          }}
        />
      </div>

      {tableName && (
        <p>
          <strong>Loaded Table:</strong> {tableName}
        </p>
      )}

      {csvMode && (
        <p style={{ color: "#a0d8ff", marginTop: "6px" }}>
          CSV mode is active. Queries are forced to DuckDB and will not run on
          Postgres/MySQL.
        </p>
      )}

      {/* ---------------- Suggested Queries ---------------- */}
      {tableName && (
        <div style={{ marginTop: "20px" }}>
          <h3>Suggested Queries:</h3>

          {suggestedQueries.map((q, i) => (
            <div
              key={i}
              style={{
                marginBottom: "8px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <code>{q}</code>
              <button
                onClick={() => setQuery(q)}
                style={{
                  padding: "4px 10px",
                  background: "#444",
                  color: "white",
                  borderRadius: "4px",
                }}
              >
                Use Query
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ---------------- Query Textbox ---------------- */}
      <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
        <div>
          <label style={{ display: "block", marginBottom: "5px" }}>Mode</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "exact" | "approx")}
            style={{ padding: "6px", background: "#2d2d2d", color: "white" }}
          >
            <option value="exact">exact</option>
            <option value="approx">approx</option>
          </select>
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "5px" }}>
            Source
          </label>
          <select
            value={source}
            onChange={(e) =>
              setSource(e.target.value as "duckdb" | "postgres" | "mysql")
            }
            style={{ padding: "6px", background: "#2d2d2d", color: "white" }}
            disabled={csvMode}
          >
            <option value="duckdb">duckdb</option>
            <option value="postgres">postgres</option>
            <option value="mysql">mysql</option>
          </select>
          {csvMode && (
            <div style={{ fontSize: "12px", marginTop: "4px", color: "#aaa" }}>
              locked to duckdb
            </div>
          )}
        </div>
      </div>

      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Enter SQL query..."
        style={{
          width: "600px",
          height: "120px",
          marginTop: "20px",
          padding: "10px",
          background: "#2d2d2d",
          color: "white",
          border: "1px solid #555",
        }}
      />

      <br />

      {/* ---------------- Action Buttons ---------------- */}
      <button
        onClick={handleAnalyze}
        style={{
          marginTop: "10px",
          marginRight: "10px",
          padding: "8px 15px",
          background: "#0066ff",
          border: "none",
          color: "white",
          borderRadius: "6px",
        }}
      >
        Analyze Query
      </button>

      <button
        onClick={handleExecute}
        style={{
          padding: "8px 15px",
          background: "#009944",
          border: "none",
          color: "white",
          borderRadius: "6px",
        }}
      >
        Run Query
      </button>

      {/* ---------------- Debug Plan Tree ---------------- */}
      {plan && (
        <div style={{ marginTop: "30px" }}>
          <h3>Parsed Plan Tree (Debug)</h3>
          <pre
            style={{
              background: "#111",
              padding: "20px",
              width: "600px",
              overflowX: "auto",
            }}
          >
            {JSON.stringify(plan, null, 2)}
          </pre>
        </div>
      )}

      {/* ---------------- Graph ---------------- */}
      {plan && (
        <div
          style={{
            height: "500px",
            width: "900px",
            marginTop: "20px",
            border: "1px solid #444",
          }}
        >
          <PlanGraph plan={plan} />
        </div>
      )}

      {/* ---------------- Query Execution Output ---------------- */}
      {error && (
        <div style={{ marginTop: "20px", color: "#ff7070" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: "40px" }}>
          <h3>Query Output</h3>
          <div style={{ marginBottom: "10px" }}>
            <div>Mode: {result.approx ? "approx" : "exact"}</div>
            <div>Source: {result.source ?? getEffectiveSource()}</div>
            <div>
              Time:{" "}
              {typeof result.time === "number"
                ? `${result.time.toFixed(6)} s`
                : "n/a"}
            </div>
            {result.sample_rate && <div>Sample rate: {result.sample_rate}</div>}
            {result.rewritten_query && (
              <div style={{ marginTop: "8px" }}>
                <strong>Rewritten Query:</strong>
                <pre style={{ background: "#111", padding: "10px" }}>
                  {result.rewritten_query}
                </pre>
              </div>
            )}
          </div>

          {Array.isArray(result.rows) && result.rows.length > 0 && (
            <table style={{ width: "600px", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {(result.columns ?? []).map((c: string) => (
                    <th
                      key={c}
                      style={{ border: "1px solid white", padding: "5px" }}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {result.rows.map((row: any[], idx: number) => (
                  <tr key={idx}>
                    {row.map((v, i) => (
                      <td
                        key={i}
                        style={{ border: "1px solid white", padding: "5px" }}
                      >
                        {String(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!Array.isArray(result.rows) && result.result !== undefined && (
            <pre
              style={{ background: "#111", padding: "20px", width: "600px" }}
            >
              {JSON.stringify(result.result, null, 2)}
            </pre>
          )}

          {Array.isArray(result.rows) && result.rows.length === 0 && (
            <p>No rows returned.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
