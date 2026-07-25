"use client";

import React, { useState, useEffect, useCallback } from "react";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import {
  subscribePlayers,
  subscribeMatches,
  subscribeTournament,
  subscribeNews,
  addPlayer,
  updatePlayer,
  addMatch,
  updateMatch,
  setTournament,
  addNews,
} from "../lib/data";
import { enablePushNotifications } from "../lib/push";
import {
  Trophy,
  Plus,
  Check,
  Clock,
  LogOut,
  Users,
  X,
  Swords,
  Newspaper,
  Settings,
  Megaphone,
  Bell,
} from "lucide-react";

const COLORS = {
  courtDeep: "#0E4B44",
  lime: "#D4FF3F",
  chalk: "#F5F2EA",
  ink: "#132420",
  clay: "#E2572B",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function addMonths(dateStr, months) {
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}
function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function PadelApp() {
  const [authReady, setAuthReady] = useState(false);
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [tournament, setTournamentState] = useState(null);
  const [news, setNews] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [tab, setTab] = useState("ranking");
  const [toast, setToast] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [lastNewsRead, setLastNewsRead] = useState(0);

  // Anonymous auth (required by Firestore rules) + restore local session
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setAuthReady(true);
      else signInAnonymously(auth).catch((e) => console.error("auth error", e));
    });
    setSessionId(localStorage.getItem("padel_session_player_id"));
    setLastNewsRead(Number(localStorage.getItem("padel_last_news_read") || 0));
    return unsub;
  }, []);

  // Real-time subscriptions, once authenticated
  useEffect(() => {
    if (!authReady) return;
    const u1 = subscribePlayers(setPlayers);
    const u2 = subscribeMatches(setMatches);
    const u3 = subscribeTournament(setTournamentState);
    const u4 = subscribeNews(setNews);
    return () => {
      u1();
      u2();
      u3();
      u4();
    };
  }, [authReady]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }, []);

  const login = (playerId) => {
    setSessionId(playerId);
    localStorage.setItem("padel_session_player_id", playerId);
  };
  const logout = () => {
    setSessionId(null);
    localStorage.removeItem("padel_session_player_id");
  };

  const openTab = (key) => {
    setTab(key);
    if (key === "noticias") {
      const now = Date.now();
      setLastNewsRead(now);
      localStorage.setItem("padel_last_news_read", String(now));
    }
  };

  if (!authReady) {
    return (
      <div style={{ background: COLORS.courtDeep }} className="min-h-screen flex items-center justify-center">
        <div className="font-display text-3xl" style={{ color: COLORS.lime }}>CARGANDO CANCHA…</div>
      </div>
    );
  }

  const me = players.find((p) => p.id === sessionId);

  if (!sessionId || !me) {
    return <AuthScreen players={players} onLogin={login} showToast={showToast} />;
  }

  return (
    <div style={{ background: COLORS.chalk }} className="min-h-screen font-body pb-24">
      <Header me={me} onLogout={logout} onSettings={() => setShowSettings(true)} />
      {showSettings && (
        <ChangePinModal me={me} players={players} onClose={() => setShowSettings(false)} showToast={showToast} />
      )}
      {toast && (
        <div
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-sm font-semibold shadow-lg"
          style={{ background: COLORS.ink, color: COLORS.lime }}
        >
          {toast}
        </div>
      )}
      <div className="max-w-md mx-auto px-4">
        {tab === "ranking" && (
          <RankingView players={players} matches={matches} tournament={tournament} me={me} showToast={showToast} />
        )}
        {tab === "nuevo" && (
          <NuevoPartidoView players={players} me={me} matches={matches} showToast={showToast} goRanking={() => openTab("historial")} />
        )}
        {tab === "historial" && <HistorialView players={players} matches={matches} me={me} showToast={showToast} />}
        {tab === "noticias" && (
          <NoticiasView news={news} me={me} showToast={showToast} onOpen={() => openTab("noticias")} />
        )}
      </div>
      <BottomNav tab={tab} setTab={openTab} matches={matches} me={me} news={news} lastNewsRead={lastNewsRead} />
    </div>
  );
}

function Header({ me, onLogout, onSettings }) {
  return (
    <div style={{ background: COLORS.courtDeep }} className="relative overflow-hidden pb-5 pt-6 px-4">
      <div className="absolute inset-x-0 top-1/2 h-px opacity-40" style={{ background: COLORS.lime }} />
      <div className="absolute left-1/2 top-2 bottom-2 w-px opacity-30" style={{ background: COLORS.lime }} />
      <div className="relative flex items-start justify-between max-w-md mx-auto">
        <div>
          <div className="font-display text-4xl leading-none" style={{ color: COLORS.lime }}>PÁDEL</div>
          <div className="font-display text-2xl leading-none text-white/90">BUCHE KUETE</div>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <button onClick={onSettings} className="text-white/70 hover:text-white"><Settings size={16} /></button>
          <button onClick={onLogout} className="flex items-center gap-1 text-xs text-white/70 hover:text-white">
            <LogOut size={14} /> {me?.name}
          </button>
        </div>
      </div>
    </div>
  );
}

function AuthScreen({ players, onLogin, showToast }) {
  const isFirstEver = players.length === 0;
  const [mode, setMode] = useState(isFirstEver ? "register" : "login");
  const [name, setName] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleRegister = async () => {
    setError("");
    if (!name.trim()) return setError("Poné tu nombre.");
    if (!/^\d{4}$/.test(pin)) return setError("El PIN debe tener 4 dígitos.");
    if (players.some((p) => p.name.toLowerCase() === name.trim().toLowerCase()))
      return setError("Ese nombre ya existe. Elegí otro o iniciá sesión.");
    setBusy(true);
    try {
      const id = await addPlayer({ name: name.trim(), pin, isAdmin: true, fcmTokens: [] });
      onLogin(id);
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = async () => {
    setError("");
    const p = players.find((pl) => pl.id === selectedId);
    if (!p) return setError("Elegí tu nombre.");
    if (p.pin !== pin) return setError("PIN incorrecto.");
    onLogin(p.id);
  };

  return (
    <div style={{ background: COLORS.courtDeep }} className="min-h-screen flex flex-col items-center justify-center px-6 font-body">
      <div className="font-display text-5xl text-center leading-none mb-1" style={{ color: COLORS.lime }}>PÁDEL</div>
      <div className="font-display text-2xl text-white/90 mb-8">BUCHE KUETE</div>

      <div className="w-full max-w-xs bg-white/5 border border-white/10 rounded-2xl p-5">
        {isFirstEver ? (
          <div className="text-xs text-white/60 mb-4 text-center leading-relaxed">
            Sos el primero en entrar: creá tu usuario y vas a quedar como administrador del grupo.
          </div>
        ) : (
          <div className="text-xs text-white/60 mb-4 text-center leading-relaxed">
            Los nuevos jugadores los da de alta el administrador. Pedile tu usuario y PIN.
          </div>
        )}

        {mode === "login" ? (
          <div className="space-y-3">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full bg-white/10 text-white rounded-lg px-3 py-2.5 text-sm outline-none"
            >
              <option value="" className="text-black">Elegí tu nombre</option>
              {players.map((p) => (
                <option key={p.id} value={p.id} className="text-black">{p.name}</option>
              ))}
            </select>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="PIN de 4 dígitos"
              inputMode="numeric"
              className="w-full bg-white/10 text-white placeholder-white/40 rounded-lg px-3 py-2.5 text-sm outline-none tracking-widest"
            />
            {error && <div className="text-xs" style={{ color: COLORS.clay }}>{error}</div>}
            <button onClick={handleLogin} className="w-full py-2.5 rounded-lg font-semibold text-sm" style={{ background: COLORS.lime, color: COLORS.ink }}>
              Entrar a la cancha
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              className="w-full bg-white/10 text-white placeholder-white/40 rounded-lg px-3 py-2.5 text-sm outline-none"
            />
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="Elegí un PIN de 4 dígitos"
              inputMode="numeric"
              className="w-full bg-white/10 text-white placeholder-white/40 rounded-lg px-3 py-2.5 text-sm outline-none tracking-widest"
            />
            {error && <div className="text-xs" style={{ color: COLORS.clay }}>{error}</div>}
            <button disabled={busy} onClick={handleRegister} className="w-full py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50" style={{ background: COLORS.lime, color: COLORS.ink }}>
              {busy ? "Creando…" : "Crear mi usuario"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ChangePinModal({ me, players, onClose, showToast }) {
  const [current, setCurrent] = useState("");
  const [next1, setNext1] = useState("");
  const [next2, setNext2] = useState("");
  const [error, setError] = useState("");

  const [newName, setNewName] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newError, setNewError] = useState("");

  const save = async () => {
    setError("");
    if (current !== me.pin) return setError("El PIN actual no coincide.");
    if (!/^\d{4}$/.test(next1)) return setError("El PIN nuevo debe tener 4 dígitos.");
    if (next1 !== next2) return setError("Los PIN nuevos no coinciden.");
    await updatePlayer(me.id, { pin: next1 });
    showToast("PIN actualizado.");
    onClose();
  };

  const addNewPlayer = async () => {
    setNewError("");
    if (!newName.trim()) return setNewError("Poné el nombre del jugador.");
    if (!/^\d{4}$/.test(newPin)) return setNewError("El PIN debe tener 4 dígitos.");
    if (players.some((p) => p.name.toLowerCase() === newName.trim().toLowerCase()))
      return setNewError("Ya existe un jugador con ese nombre.");
    await addPlayer({ name: newName.trim(), pin: newPin, isAdmin: false, fcmTokens: [] });
    setNewName("");
    setNewPin("");
    showToast(`${newName.trim()} fue agregado.`);
  };

  const enableNotifs = async () => {
    const res = await enablePushNotifications(me.id);
    if (res.ok) showToast("Notificaciones activadas.");
    else if (res.reason === "denied") showToast("Bloqueaste los permisos de notificación.");
    else showToast("No se pudieron activar las notificaciones en este navegador.");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-6" onClick={onClose}>
      <div className="bg-white rounded-2xl p-5 w-full max-w-xs max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="font-display text-xl" style={{ color: COLORS.ink }}>AJUSTES</div>
          <button onClick={onClose} className="text-black/40 hover:text-black"><X size={18} /></button>
        </div>

        <button
          onClick={enableNotifs}
          className="w-full py-2.5 rounded-lg font-semibold text-sm mb-4 flex items-center justify-center gap-1.5"
          style={{ background: COLORS.courtDeep, color: "white" }}
        >
          <Bell size={15} /> Activar notificaciones
        </button>

        <div className="text-xs font-semibold mb-2" style={{ color: COLORS.courtDeep }}>Cambiar mi PIN</div>
        <div className="space-y-2.5">
          <input value={current} onChange={(e) => setCurrent(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="PIN actual" inputMode="numeric" className="w-full border rounded-lg px-3 py-2 text-sm tracking-widest" />
          <input value={next1} onChange={(e) => setNext1(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="PIN nuevo" inputMode="numeric" className="w-full border rounded-lg px-3 py-2 text-sm tracking-widest" />
          <input value={next2} onChange={(e) => setNext2(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Repetir PIN nuevo" inputMode="numeric" className="w-full border rounded-lg px-3 py-2 text-sm tracking-widest" />
          {error && <div className="text-xs" style={{ color: COLORS.clay }}>{error}</div>}
          <button onClick={save} className="w-full py-2.5 rounded-lg font-semibold text-sm" style={{ background: COLORS.lime, color: COLORS.ink }}>Guardar PIN</button>
        </div>

        {me.isAdmin && (
          <div className="mt-5 pt-4 border-t" style={{ borderColor: "#eee" }}>
            <div className="text-xs font-semibold mb-2" style={{ color: COLORS.courtDeep }}>Agregar jugador (admin)</div>
            <div className="space-y-2.5">
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre del jugador" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="PIN inicial (4 dígitos)" inputMode="numeric" className="w-full border rounded-lg px-3 py-2 text-sm tracking-widest" />
              {newError && <div className="text-xs" style={{ color: COLORS.clay }}>{newError}</div>}
              <button onClick={addNewPlayer} className="w-full py-2.5 rounded-lg font-semibold text-sm" style={{ background: COLORS.courtDeep, color: "white" }}>Agregar jugador</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RankingView({ players, matches, tournament, me, showToast }) {
  const [editingDate, setEditingDate] = useState(tournament?.startDate || todayISO());

  useEffect(() => {
    if (tournament?.startDate) setEditingDate(tournament.startDate);
  }, [tournament?.startDate]);

  const endDate = tournament ? addMonths(tournament.startDate, 2) : null;
  const today = todayISO();
  const status = !tournament ? "none" : today < tournament.startDate ? "upcoming" : today > endDate ? "finished" : "active";

  const confirmedInWindow = tournament
    ? matches.filter((m) => m.status === "confirmado" && m.date >= tournament.startDate && m.date <= endDate)
    : [];

  const pointsById = {};
  players.forEach((p) => (pointsById[p.id] = 0));
  confirmedInWindow.forEach((m) => {
    m.teamA.forEach((id) => (pointsById[id] = (pointsById[id] || 0) + m.scoreA));
    m.teamB.forEach((id) => (pointsById[id] = (pointsById[id] || 0) + m.scoreB));
  });

  const ranked = [...players].sort((a, b) => (pointsById[b.id] || 0) - (pointsById[a.id] || 0));

  const saveTournament = async () => {
    if (!editingDate) return;
    await setTournament({ startDate: editingDate });
    showToast("Torneo configurado.");
  };

  return (
    <div className="pt-5">
      <div className="flex items-center gap-2 mb-1">
        <Trophy size={18} style={{ color: COLORS.courtDeep }} />
        <h2 className="font-display text-2xl" style={{ color: COLORS.ink }}>RANKING</h2>
        <span className="text-xs text-black/40 ml-auto">{confirmedInWindow.length} partidos jugados</span>
      </div>

      {tournament ? (
        <div className="text-xs text-black/50 mb-4">
          Torneo {fmtDate(tournament.startDate)} — {fmtDate(endDate)}
          {status === "upcoming" && <span className="ml-1" style={{ color: COLORS.clay }}>· todavía no arrancó</span>}
          {status === "finished" && <span className="ml-1" style={{ color: COLORS.clay }}>· finalizado</span>}
          {status === "active" && <span className="ml-1" style={{ color: "#4d6b00" }}>· en curso</span>}
        </div>
      ) : (
        <div className="text-xs text-black/40 mb-4">Todavía no hay un torneo configurado.</div>
      )}

      {me?.isAdmin && (
        <div className="bg-white rounded-xl p-3.5 shadow-sm border mb-4" style={{ borderColor: "#eee" }}>
          <div className="text-xs font-semibold mb-2" style={{ color: COLORS.courtDeep }}>Configurar torneo (admin)</div>
          <div className="flex gap-2">
            <input type="date" value={editingDate} onChange={(e) => setEditingDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm flex-1" />
            <button onClick={saveTournament} className="px-3 py-2 rounded-lg text-xs font-semibold" style={{ background: COLORS.lime, color: COLORS.ink }}>Guardar</button>
          </div>
          <div className="text-[11px] text-black/40 mt-1.5">Dura 2 meses desde la fecha de inicio.</div>
        </div>
      )}

      {ranked.length === 0 && <EmptyState text="Todavía no hay jugadores en la cancha." />}

      <div className="space-y-2">
        {ranked.map((p, i) => (
          <div key={p.id} className="flex items-center gap-3 bg-white rounded-xl px-3 py-3 shadow-sm border" style={{ borderColor: i === 0 ? COLORS.lime : "#eee" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-display text-base shrink-0" style={{ background: i === 0 ? COLORS.lime : COLORS.courtDeep, color: i === 0 ? COLORS.ink : "white" }}>
              {i + 1}
            </div>
            <div className="flex-1 font-semibold text-sm" style={{ color: COLORS.ink }}>{p.name}</div>
            <div className="text-right">
              <div className="font-display text-xl leading-none" style={{ color: COLORS.courtDeep }}>{pointsById[p.id] || 0}</div>
              <div className="text-[10px] text-black/40 -mt-0.5">pts</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NuevoPartidoView({ players, me, matches, showToast, goRanking }) {
  const [teamA2, setTeamA2] = useState("");
  const [teamB1, setTeamB1] = useState("");
  const [teamB2, setTeamB2] = useState("");
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const ids = [me.id, teamA2, teamB1, teamB2];
  const options = (excludeSelf) => players.filter((p) => !ids.filter((x) => x !== excludeSelf).includes(p.id) || p.id === excludeSelf);

  const submit = async () => {
    setError("");
    if (new Set(ids.filter(Boolean)).size < 4 || ids.some((x) => !x)) return setError("Elegí 4 jugadores distintos.");
    if (scoreA === "" || scoreB === "" || scoreA === scoreB) return setError("Cargá un resultado válido (sin empate).");

    const winnerTeam = Number(scoreA) > Number(scoreB) ? "A" : "B";
    setBusy(true);
    try {
      await addMatch({
        date,
        teamA: [me.id, teamA2],
        teamB: [teamB1, teamB2],
        scoreA: Number(scoreA),
        scoreB: Number(scoreB),
        winnerTeam,
        submittedBy: me.id,
        confirmedBy: [me.id],
        status: "pendiente",
        createdAt: Date.now(),
      });
      showToast("Partido cargado. Falta la confirmación del rival.");
      goRanking();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pt-5">
      <div className="flex items-center gap-2 mb-4">
        <Swords size={18} style={{ color: COLORS.courtDeep }} />
        <h2 className="font-display text-2xl" style={{ color: COLORS.ink }}>CARGAR PARTIDO</h2>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
        <div>
          <div className="text-xs font-semibold mb-1.5" style={{ color: COLORS.courtDeep }}>EQUIPO A</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="border rounded-lg px-3 py-2 text-sm bg-black/5 text-black/60">{me.name}</div>
            <PlayerSelect value={teamA2} onChange={setTeamA2} players={options(teamA2)} placeholder="Compañero" />
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold mb-1.5" style={{ color: COLORS.clay }}>EQUIPO B</div>
          <div className="grid grid-cols-2 gap-2">
            <PlayerSelect value={teamB1} onChange={setTeamB1} players={options(teamB1)} placeholder="Rival 1" />
            <PlayerSelect value={teamB2} onChange={setTeamB2} players={options(teamB2)} placeholder="Rival 2" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 items-center">
          <input value={scoreA} onChange={(e) => setScoreA(e.target.value.replace(/\D/g, ""))} placeholder="Sets equipo A" inputMode="numeric" className="border rounded-lg px-3 py-2 text-sm text-center" />
          <input value={scoreB} onChange={(e) => setScoreB(e.target.value.replace(/\D/g, ""))} placeholder="Sets equipo B" inputMode="numeric" className="border rounded-lg px-3 py-2 text-sm text-center" />
        </div>

        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm w-full" />

        {error && <div className="text-xs" style={{ color: COLORS.clay }}>{error}</div>}

        <button disabled={busy} onClick={submit} className="w-full py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-1.5 disabled:opacity-50" style={{ background: COLORS.courtDeep, color: "white" }}>
          <Plus size={16} /> {busy ? "Cargando…" : "Cargar resultado"}
        </button>
      </div>
    </div>
  );
}

function PlayerSelect({ value, onChange, players, placeholder }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-white">
      <option value="">{placeholder}</option>
      {players.map((p) => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  );
}

function HistorialView({ players, matches, me, showToast }) {
  const nameOf = (id) => players.find((p) => p.id === id)?.name || "?";

  const confirm = async (match) => {
    const opponentTeam = match.submittedBy === match.teamA[0] || match.submittedBy === match.teamA[1] ? match.teamB : match.teamA;
    if (!opponentTeam.includes(me.id)) {
      showToast("Solo el equipo rival puede confirmar este resultado.");
      return;
    }
    const confirmedBy = Array.from(new Set([...match.confirmedBy, me.id]));
    const nowConfirmed = opponentTeam.some((id) => confirmedBy.includes(id));
    const status = nowConfirmed ? "confirmado" : "pendiente";
    await updateMatch(match.id, { confirmedBy, status });
    showToast(nowConfirmed ? "¡Resultado confirmado! Puntos actualizados." : "Confirmación registrada.");
  };

  const sorted = [...matches].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="pt-5">
      <div className="flex items-center gap-2 mb-4">
        <Clock size={18} style={{ color: COLORS.courtDeep }} />
        <h2 className="font-display text-2xl" style={{ color: COLORS.ink }}>HISTORIAL</h2>
      </div>

      {sorted.length === 0 && <EmptyState text="Todavía no se cargó ningún partido." />}

      <div className="space-y-3">
        {sorted.map((m) => {
          const opponentTeam = m.submittedBy === m.teamA[0] || m.submittedBy === m.teamA[1] ? m.teamB : m.teamA;
          const canConfirm = m.status === "pendiente" && opponentTeam.includes(me.id) && !m.confirmedBy.includes(me.id);

          return (
            <div key={m.id} className="bg-white rounded-xl p-4 shadow-sm border" style={{ borderColor: "#eee" }}>
              <div className="flex items-center justify-between text-[11px] text-black/40 mb-2">
                <span>{m.date}</span>
                <StatusPill status={m.status} />
              </div>
              <div className="flex items-center justify-between mb-1.5">
                <TeamNames names={[nameOf(m.teamA[0]), nameOf(m.teamA[1])]} bold={m.winnerTeam === "A"} />
                <div className="font-display text-lg px-2" style={{ color: COLORS.courtDeep }}>{m.scoreA} – {m.scoreB}</div>
                <TeamNames names={[nameOf(m.teamB[0]), nameOf(m.teamB[1])]} bold={m.winnerTeam === "B"} align="right" />
              </div>
              {canConfirm && (
                <button onClick={() => confirm(m)} className="mt-3 w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5" style={{ background: COLORS.lime, color: COLORS.ink }}>
                  <Check size={14} /> Confirmar resultado
                </button>
              )}
              {m.status === "pendiente" && !canConfirm && (
                <div className="mt-3 text-[11px] text-center text-black/40">Esperando confirmación del rival</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TeamNames({ names, bold, align = "left" }) {
  return (
    <div className={`text-xs leading-tight ${align === "right" ? "text-right" : ""}`} style={{ color: bold ? COLORS.ink : "#999", fontWeight: bold ? 700 : 500 }}>
      <div>{names[0]}</div>
      <div>{names[1]}</div>
    </div>
  );
}

function StatusPill({ status }) {
  const confirmed = status === "confirmado";
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: confirmed ? "rgba(212,255,63,0.25)" : "rgba(226,87,43,0.12)", color: confirmed ? "#4d6b00" : COLORS.clay }}>
      {confirmed ? "Confirmado" : "Pendiente"}
    </span>
  );
}

function EmptyState({ text }) {
  return (
    <div className="text-center py-10 text-sm text-black/40 flex flex-col items-center gap-2">
      <Users size={24} className="text-black/20" />
      {text}
    </div>
  );
}

function NoticiasView({ news, me, showToast }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const publish = async () => {
    setError("");
    if (!title.trim() || !body.trim()) return setError("Completá título y contenido.");
    setBusy(true);
    try {
      await addNews({
        title: title.trim(),
        body: body.trim(),
        date: todayISO(),
        authorId: me.id,
        authorName: me.name,
        createdAt: Date.now(),
      });
      setTitle("");
      setBody("");
      showToast("Noticia publicada. Se notificó a todo el grupo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pt-5">
      <div className="flex items-center gap-2 mb-4">
        <Newspaper size={18} style={{ color: COLORS.courtDeep }} />
        <h2 className="font-display text-2xl" style={{ color: COLORS.ink }}>NOTICIAS</h2>
      </div>

      {me?.isAdmin && (
        <div className="bg-white rounded-xl p-3.5 shadow-sm border mb-4" style={{ borderColor: "#eee" }}>
          <div className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: COLORS.courtDeep }}>
            <Megaphone size={13} /> Publicar noticia (admin)
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" className="w-full border rounded-lg px-3 py-2 text-sm mb-2" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Contenido de la noticia" rows={3} className="w-full border rounded-lg px-3 py-2 text-sm mb-2 resize-none" />
          {error && <div className="text-xs mb-2" style={{ color: COLORS.clay }}>{error}</div>}
          <button disabled={busy} onClick={publish} className="w-full py-2 rounded-lg text-xs font-semibold disabled:opacity-50" style={{ background: COLORS.courtDeep, color: "white" }}>
            {busy ? "Publicando…" : "Publicar"}
          </button>
        </div>
      )}

      {news.length === 0 && <EmptyState text="Todavía no hay noticias publicadas." />}

      <div className="space-y-3">
        {news.map((n) => (
          <div key={n.id} className="bg-white rounded-xl p-4 shadow-sm border" style={{ borderColor: "#eee" }}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="font-semibold text-sm" style={{ color: COLORS.ink }}>{n.title}</div>
              <div className="text-[10px] text-black/40 shrink-0 ml-2">{fmtDate(n.date)}</div>
            </div>
            <div className="text-xs text-black/60 whitespace-pre-wrap leading-relaxed">{n.body}</div>
            <div className="text-[10px] text-black/30 mt-2">— {n.authorName}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BottomNav({ tab, setTab, matches, me, news, lastNewsRead }) {
  const pendingForMe = matches.filter((m) => {
    const opponentTeam = m.submittedBy === m.teamA[0] || m.submittedBy === m.teamA[1] ? m.teamB : m.teamA;
    return m.status === "pendiente" && opponentTeam.includes(me.id) && !m.confirmedBy.includes(me.id);
  }).length;

  const unreadNews = news.filter((n) => n.createdAt > lastNewsRead).length;

  const items = [
    { key: "ranking", label: "Ranking", icon: Trophy },
    { key: "nuevo", label: "Cargar", icon: Plus },
    { key: "historial", label: "Historial", icon: Clock, badge: pendingForMe },
    { key: "noticias", label: "Noticias", icon: Newspaper, badge: unreadNews },
  ];

  return (
    <div className="fixed bottom-0 inset-x-0 bg-white border-t" style={{ borderColor: "#eee" }}>
      <div className="max-w-md mx-auto grid grid-cols-4">
        {items.map(({ key, label, icon: Icon, badge }) => (
          <button key={key} onClick={() => setTab(key)} className="relative flex flex-col items-center gap-1 py-2.5" style={{ color: tab === key ? COLORS.courtDeep : "#aaa" }}>
            <Icon size={20} />
            <span className="text-[10px] font-semibold">{label}</span>
            {!!badge && (
              <span className="absolute top-1 right-6 w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold" style={{ background: COLORS.clay, color: "white" }}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
