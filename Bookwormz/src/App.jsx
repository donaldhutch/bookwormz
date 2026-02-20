import { useState, useEffect } from "react";

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRMPw4b2cTyo7QWLarQDzB9hu53_fwEUu6qiMrVtZHDnALwpCRwtftW2JHophA6j-OTV6fIgEAbo4N2/pub?output=csv";

const MEMBER_COLORS = {
  Don:  { bg: "#e8f4f8", accent: "#2980b9", text: "#1a5276" },
  Dave: { bg: "#fef9e7", accent: "#d4ac0d", text: "#7d6608" },
  Chan: { bg: "#fdf2f8", accent: "#cb4335", text: "#78281f" },
};

const scoreColor = (score) => {
  if (score >= 90) return "#27ae60";
  if (score >= 80) return "#2ecc71";
  if (score >= 70) return "#f39c12";
  if (score >= 60) return "#e67e22";
  return "#e74c3c";
};

function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map(line => {
    const cols = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQuotes = !inQuotes; }
      else if (line[i] === "," && !inQuotes) { cols.push(current.trim()); current = ""; }
      else { current += line[i]; }
    }
    cols.push(current.trim());
    const row = {};
    headers.forEach((h, i) => row[h] = cols[i] || "");
    const parseScore = (val) => {
      if (!val || val.trim() === "") return null;
      return parseFloat(val.replace("%", ""));
    };
    return {
      title: row["Book Title"]?.trim(),
      author: row["Author"]?.trim(),
      year: row["Year Published"]?.trim(),
      picker: row["Who Picked"]?.trim(),
      date: row["Date Picked"]?.trim(),
      don:  parseScore(row["Don Score"]),
      dave: parseScore(row["Dave Score"]),
      chan: parseScore(row["Chan Score"]),
      avg:  parseScore(row["Average Score"]),
    };
  }).filter(b => b.title);
}

const ScoreBar = ({ score, name }) => {
  if (score === null) return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#bbb", marginBottom: 2 }}>
        <span>{name}</span><span>—</span>
      </div>
      <div style={{ height: 5, background: "#f0f0f0", borderRadius: 3 }} />
    </div>
  );
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
        <span style={{ fontWeight: 600, color: "#555" }}>{name}</span>
        <span style={{ color: scoreColor(score), fontWeight: 700 }}>{score.toFixed(1)}%</span>
      </div>
      <div style={{ height: 5, background: "#f0f0f0", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score}%`, background: scoreColor(score), borderRadius: 3 }} />
      </div>
    </div>
  );
};

export default function BookWormz() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("date");
  const [search, setSearch] = useState("");
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    fetch(CSV_URL)
      .then(r => r.text())
      .then(text => { setBooks(parseCSV(text)); setLoading(false); })
      .catch(() => { setError("Couldn't load data from Google Sheets."); setLoading(false); });
  }, []);

  const members = ["All", "Don", "Dave", "Chan"];
  const sorted = [...books]
    .filter(b => filter === "All" || b.picker === filter)
    .filter(b => b.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "score") return b.avg - a.avg;
      if (sort === "title") return a.title.localeCompare(b.title);
      return 0;
    });

  const topBook = [...books].sort((a, b) => b.avg - a.avg)[0];
  const avgAll = books.length ? (books.reduce((s, b) => s + (b.avg || 0), 0) / books.length).toFixed(1) : "—";
  const pickerStats = ["Don", "Dave", "Chan"].map(name => {
    const picked = books.filter(b => b.picker === name);
    const avg = picked.length ? (picked.reduce((s, b) => s + (b.avg || 0), 0) / picked.length).toFixed(1) : "—";
    return { name, count: picked.length, avg };
  });

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f4ef", fontFamily: "Georgia, serif", fontSize: 20, color: "#888" }}>
      Loading The Book Wormz... 📚
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f4ef", fontFamily: "Georgia, serif", fontSize: 18, color: "#c0392b" }}>
      {error}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f7f4ef", fontFamily: "Georgia, serif", color: "#1a1a1a" }}>
      <div style={{ background: "#1a1a2e", color: "white", padding: "40px 32px 32px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 20px)" }} />
        <div style={{ position: "relative", maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 8 }}>
            <span style={{ fontSize: 48 }}>📚</span>
            <div>
              <div style={{ fontSize: 11, letterSpacing: 4, color: "#aaa", textTransform: "uppercase", marginBottom: 4 }}>Est. 2023</div>
              <h1 style={{ margin: 0, fontSize: 42, fontWeight: 700, letterSpacing: -1 }}>The Book Wormz</h1>
            </div>
          </div>
          <p style={{ margin: "8px 0 24px", color: "#aaa", fontSize: 15 }}>Don · Dave · Chan — {books.length} books read and rated</p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 20px" }}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{avgAll}%</div>
              <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: 1 }}>Group Avg</div>
            </div>
            {pickerStats.map(p => (
              <div key={p.name} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 20px" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: MEMBER_COLORS[p.name].accent }}>{p.avg}%</div>
                <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: 1 }}>{p.name} · {p.count} picks</div>
              </div>
            ))}
            {topBook && (
              <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 20px", flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>🏆 {topBook.title}</div>
                <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: 1 }}>Top rated · {topBook.avg}%</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 32px 0" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            placeholder="Search books..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, background: "white", flex: 1, minWidth: 180, fontFamily: "Georgia, serif" }}
          />
          <div style={{ display: "flex", gap: 6 }}>
            {members.map(m => (
              <button key={m} onClick={() => setFilter(m)} style={{
                padding: "9px 15px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "Georgia, serif",
                background: filter === m ? (m === "All" ? "#1a1a2e" : MEMBER_COLORS[m]?.accent) : "white",
                color: filter === m ? "white" : "#555",
              }}>{m}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[["date", "📅 Date"], ["score", "⭐ Score"], ["title", "🔤 Title"]].map(([val, label]) => (
              <button key={val} onClick={() => setSort(val)} style={{
                padding: "9px 12px", borderRadius: 8, border: "1px solid #ddd", cursor: "pointer", fontSize: 12,
                background: sort === val ? "#1a1a2e" : "white", color: sort === val ? "white" : "#555", fontFamily: "Georgia, serif"
              }}>{label}</button>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 13, color: "#888", marginTop: 10 }}>Showing {sorted.length} of {books.length} books</div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 32px 48px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 18 }}>
          {sorted.map((book) => {
            const color = MEMBER_COLORS[book.picker] || MEMBER_COLORS["Don"];
            const isHovered = hovered === book.title;
            return (
              <div key={book.title}
                onMouseEnter={() => setHovered(book.title)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  background: "white", borderRadius: 14, overflow: "hidden",
                  boxShadow: isHovered ? "0 8px 28px rgba(0,0,0,0.13)" : "0 2px 10px rgba(0,0,0,0.06)",
                  border: "1px solid #ece9e3",
                  transform: isHovered ? "translateY(-3px)" : "none",
                  transition: "all 0.2s"
                }}>
                <div style={{ height: 5, background: color.accent }} />
                <div style={{ padding: "18px 20px 20px" }}>
                  <h3 style={{ margin: "0 0 2px", fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>{book.title}</h3>
                  {book.author && <div style={{ fontSize: 13, color: "#888", fontStyle: "italic", marginBottom: 2 }}>{book.author}</div>}
                  {book.year && <div style={{ fontSize: 11, color: "#bbb", marginBottom: 10 }}>Published {book.year}</div>}
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
                    <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: color.bg, color: color.text, fontWeight: 700 }}>📖 {book.picker}'s pick</span>
                    <span style={{ fontSize: 11, color: "#aaa" }}>{book.date}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f7f4ef", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
                    <span style={{ fontSize: 12, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Group Score</span>
                    <span style={{ fontSize: 24, fontWeight: 700, color: scoreColor(book.avg) }}>{book.avg?.toFixed(1)}%</span>
                  </div>
                  <ScoreBar score={book.don} name="Don" />
                  <ScoreBar score={book.dave} name="Dave" />
                  <ScoreBar score={book.chan} name="Chan" />
                </div>
              </div>
            );
          })}
        </div>
        {sorted.length === 0 && <div style={{ textAlign: "center", padding: 60, color: "#aaa", fontSize: 18 }}>No books found 📚</div>}
      </div>
      <div style={{ textAlign: "center", padding: "0 0 32px", color: "#bbb", fontSize: 12 }}>The Book Wormz · Built with Claude</div>
    </div>
  );
}
