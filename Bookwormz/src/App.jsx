import { useState, useEffect } from "react";

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRMPw4b2cTyo7QWLarQDzB9hu53_fwEUu6qiMrVtZHDnALwpCRwtftW2JHophA6j-OTV6fIgEAbo4N2/pub?output=csv";
const GOOGLE_BOOKS_API_KEY = "AIzaSyDtm_GPThGXNzn_wpPqls-gjGjeO-TfciU";

const MEMBER_COLORS = {
  Don:  { bg: "#e8f4f8", accent: "#2980b9", text: "#1a5276" },
  Dave: { bg: "#fef9e7", accent: "#d4ac0d", text: "#7d6608" },
  Chan: { bg: "#fdf2f8", accent: "#cb4335", text: "#78281f" },
};

// Convert percentage (0-100) to 1-5 star scale
const pctToStars = (pct) => pct === null ? null : Math.round((pct / 100 * 5) * 100) / 100;

const starColor = (stars) => {
  if (stars >= 4.5) return "#27ae60";
  if (stars >= 4.0) return "#2ecc71";
  if (stars >= 3.5) return "#f39c12";
  if (stars >= 3.0) return "#e67e22";
  return "#e74c3c";
};

const StarDisplay = ({ stars }) => {
  if (stars === null) return null;
  const full = Math.floor(stars);
  const half = stars - full >= 0.25 && stars - full < 0.75;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span style={{ fontSize: 13, letterSpacing: 1 }}>
      {"★".repeat(full)}
      {half ? "½" : ""}
      {"☆".repeat(empty)}
    </span>
  );
};

const ScoreRow = ({ stars, name, color }) => {
  if (stars === null) return (
    <div style={{ marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "#bbb" }}>
      <span>{name}</span><span>—</span>
    </div>
  );
  return (
    <div style={{ marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#555" }}>{name}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ color: color || starColor(stars) }}><StarDisplay stars={stars} /></span>
        <span style={{ fontSize: 12, fontWeight: 700, color: color || starColor(stars) }}>{stars.toFixed(2)}</span>
      </div>
    </div>
  );
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
    const parseGoodreads = (val) => {
      if (!val || val.trim() === "") return null;
      return parseFloat(val);
    };
    return {
      title:     row["Book Title"]?.trim(),
      author:    row["Author"]?.trim(),
      year:      row["Year Published"]?.trim(),
      picker:    row["Who Picked"]?.trim(),
      date:      row["Date Picked"]?.trim(),
      don:       pctToStars(parseScore(row["Don Score"])),
      dave:      pctToStars(parseScore(row["Dave Score"])),
      chan:      pctToStars(parseScore(row["Chan Score"])),
      avg:       pctToStars(parseScore(row["Average Score"])),
      isbn:      row["ISBN"]?.trim() || null,
      goodreads: parseGoodreads(row["Goodreads score"]),
    };
  }).filter(b => b.title);
}

function extractThumbnail(items) {
  if (!items || items.length === 0) return null;
  for (const item of items) {
    const thumb = item.volumeInfo?.imageLinks?.thumbnail || item.volumeInfo?.imageLinks?.smallThumbnail;
    if (thumb) return thumb.replace("http://", "https://");
  }
  return null;
}

async function fetchCoverThumbnail(isbn, title, author) {
  const KEY = GOOGLE_BOOKS_API_KEY;
  try {
    if (isbn) {
      const res  = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=5&key=${KEY}`);
      const data = await res.json();
      const thumb = extractThumbnail(data.items);
      if (thumb) return thumb;
    }
    const q = encodeURIComponent(`intitle:${title} inauthor:${author}`);
    const res  = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=5&key=${KEY}`);
    const data = await res.json();
    return extractThumbnail(data.items);
  } catch (e) { return null; }
}

export default function BookWormz() {
  const [books, setBooks] = useState([]);
  const [thumbnails, setThumbnails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("score");
  const [search, setSearch] = useState("");
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    fetch(CSV_URL)
      .then(r => r.text())
      .then(async text => {
        const parsed = parseCSV(text);
        setBooks(parsed);
        setLoading(false);
        for (const book of parsed) {
          const thumb = await fetchCoverThumbnail(book.isbn, book.title, book.author);
          if (thumb) {
            setThumbnails(prev => ({ ...prev, [book.title]: thumb }));
          }
        }
      })
      .catch(() => { setError("Couldn't load data from Google Sheets."); setLoading(false); });
  }, []);

  const currentlyReading = books.filter(b => b.avg === null && b.don === null && b.dave === null && b.chan === null);
  const finishedBooks = books.filter(b => b.avg !== null);

  const members = ["All", "Don", "Dave", "Chan"];
  const sorted = [...finishedBooks]
    .filter(b => filter === "All" || b.picker === filter)
    .filter(b => b.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "score") return b.avg - a.avg;
      if (sort === "title") return a.title.localeCompare(b.title);
      return 0;
    });

  const topBook = [...finishedBooks].sort((a, b) => b.avg - a.avg)[0];
  const avgAll = finishedBooks.length
    ? (finishedBooks.reduce((s, b) => s + (b.avg || 0), 0) / finishedBooks.length).toFixed(2)
    : "—";
  const pickerStats = ["Don", "Dave", "Chan"].map(name => {
    const picked = finishedBooks.filter(b => b.picker === name);
    const avg = picked.length
      ? (picked.reduce((s, b) => s + (b.avg || 0), 0) / picked.length).toFixed(2)
      : "—";
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

      {/* Header */}
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
          <p style={{ margin: "8px 0 24px", color: "#aaa", fontSize: 15 }}>Don · Dave · Chan — {finishedBooks.length} books read and rated</p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 20px" }}>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{avgAll} <span style={{ fontSize: 18 }}>★</span></div>
              <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: 1 }}>Group Avg</div>
            </div>
            {pickerStats.map(p => (
              <div key={p.name} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 20px" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: MEMBER_COLORS[p.name].accent }}>{p.avg} <span style={{ fontSize: 18 }}>★</span></div>
                <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: 1 }}>{p.name} · {p.count} picks</div>
              </div>
            ))}
            {topBook && (
              <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 20px", flex: 1, minWidth: 180, display: "flex", alignItems: "center", gap: 12 }}>
                {thumbnails[topBook.title] && (
                  <img src={thumbnails[topBook.title]} alt={topBook.title} style={{ width: 36, height: 52, objectFit: "cover", borderRadius: 3, boxShadow: "0 2px 8px rgba(0,0,0,0.4)", flexShrink: 0 }} />
                )}
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>🏆 {topBook.title}</div>
                  <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: 1 }}>Top rated · {topBook.avg} ★</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Currently Reading Banner */}
      {currentlyReading.length > 0 && (
        <div style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #2d3561 100%)", borderBottom: "3px solid #f39c12" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 32px" }}>
            <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#f39c12", marginBottom: 16, fontWeight: 700 }}>
              📖 Currently Reading
            </div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              {currentlyReading.map(book => {
                const color = MEMBER_COLORS[book.picker] || MEMBER_COLORS["Don"];
                return (
                  <div key={book.title} style={{ display: "flex", gap: 16, alignItems: "center", background: "rgba(255,255,255,0.07)", borderRadius: 14, padding: "16px 20px", flex: 1, minWidth: 280, border: "1px solid rgba(243,156,18,0.3)" }}>
                    {thumbnails[book.title] ? (
                      <img src={thumbnails[book.title]} alt={book.title} style={{ width: 52, height: 72, objectFit: "cover", borderRadius: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.4)", flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 52, height: 72, background: "rgba(255,255,255,0.1)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>📗</div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "white", lineHeight: 1.2, marginBottom: 4 }}>{book.title}</div>
                      {book.author && <div style={{ fontSize: 13, color: "#aaa", fontStyle: "italic", marginBottom: 8 }}>{book.author}</div>}
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: color.bg, color: color.text, fontWeight: 700 }}>📖 {book.picker}'s pick</span>
                        {book.date && <span style={{ fontSize: 11, color: "#888" }}>Started {book.date}</span>}
                        {book.goodreads && <span style={{ fontSize: 11, color: "#f39c12", fontWeight: 600 }}>★ {book.goodreads} on Goodreads</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: "center", flexShrink: 0 }}>
                      <div style={{ fontSize: 28 }}>🐛</div>
                      <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>In progress</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
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
            {[["score", "⭐ Score"], ["title", "🔤 Title"]].map(([val, label]) => (
              <button key={val} onClick={() => setSort(val)} style={{
                padding: "9px 12px", borderRadius: 8, border: "1px solid #ddd", cursor: "pointer", fontSize: 12,
                background: sort === val ? "#1a1a2e" : "white", color: sort === val ? "white" : "#555", fontFamily: "Georgia, serif"
              }}>{label}</button>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 13, color: "#888", marginTop: 10 }}>Showing {sorted.length} of {finishedBooks.length} books</div>
      </div>

      {/* Grid */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 32px 48px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 18 }}>
          {sorted.map((book) => {
            const color = MEMBER_COLORS[book.picker] || MEMBER_COLORS["Don"];
            const isHovered = hovered === book.title;
            const thumb = thumbnails[book.title];
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
                <div style={{ padding: "16px 18px 18px" }}>

                  {/* Cover + title row */}
                  <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
                    <div style={{ flexShrink: 0 }}>
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={book.title}
                          style={{ width: 68, height: 100, objectFit: "cover", borderRadius: 4, boxShadow: "0 3px 10px rgba(0,0,0,0.2)" }}
                          onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                        />
                      ) : null}
                      <div style={{
                        width: 68, height: 100, background: `linear-gradient(135deg, ${color.accent}33, ${color.accent}66)`,
                        borderRadius: 4, display: thumb ? "none" : "flex",
                        alignItems: "center", justifyContent: "center", fontSize: 28,
                        boxShadow: "0 3px 10px rgba(0,0,0,0.1)", border: `1px solid ${color.accent}44`
                      }}>📚</div>
                    </div>

                    {/* Title / author / meta */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ margin: "0 0 3px", fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{book.title}</h3>
                      {book.author && <div style={{ fontSize: 12, color: "#888", fontStyle: "italic", marginBottom: 3 }}>{book.author}</div>}
                      {book.year && <div style={{ fontSize: 11, color: "#bbb", marginBottom: 8 }}>Published {book.year}</div>}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: color.bg, color: color.text, fontWeight: 700 }}>📖 {book.picker}'s pick</span>
                        <span style={{ fontSize: 11, color: "#aaa" }}>{book.date}</span>
                      </div>
                    </div>
                  </div>

                  {/* Scores */}
                  <div style={{ marginBottom: 10 }}>
                    <ScoreRow stars={book.avg} name="🐛 Book Wormz" />
                    {book.goodreads !== null && (
                      <ScoreRow stars={book.goodreads} name="📗 Goodreads" color="#4a7c59" />
                    )}
                  </div>

                  <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 12 }}>
                    <div style={{ fontSize: 10, color: "#bbb", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Individual Scores</div>
                    <ScoreRow stars={book.don}  name="Don"  color={MEMBER_COLORS.Don.accent}  />
                    <ScoreRow stars={book.dave} name="Dave" color={MEMBER_COLORS.Dave.accent} />
                    <ScoreRow stars={book.chan}  name="Chan" color={MEMBER_COLORS.Chan.accent} />
                  </div>
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
