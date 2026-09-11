import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clipboard, Crown, Flag, Link2, Play, RotateCcw, Sparkles, Timer, Users, Wifi, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Room = {
  id: string;
  code: string;
  host_name: string;
  duration_seconds: number;
  passage: string;
  status: "waiting" | "racing" | "results";
};

type Player = {
  id: string;
  room_id: string;
  display_name: string;
  is_host: boolean;
  is_ready: boolean;
  wpm: number;
  accuracy: number;
  progress: number;
  finished: boolean;
};

const PASSAGES = [
  "Small steps still move the story forward. Find your rhythm, trust your hands, and let the next word arrive before you overthink it.",
  "A good race is not only about speed. It is about staying curious, keeping your eyes ahead, and making every letter count.",
  "The best ideas often begin as messy sketches. Give yourself permission to start, then keep going until the shape becomes clear.",
];

const SAMPLE_PLAYERS: Player[] = [
  { id: "sample-1", room_id: "sample", display_name: "Alex", is_host: true, is_ready: true, wpm: 72, accuracy: 96, progress: 72, finished: false },
  { id: "sample-2", room_id: "sample", display_name: "Sam", is_host: false, is_ready: true, wpm: 65, accuracy: 94, progress: 58, finished: false },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Type & Tally — Multiplayer Typing Races" },
      { name: "description", content: "Create a room, invite friends, and race through the same words in real time." },
      { property: "og:title", content: "Type & Tally — Multiplayer Typing Races" },
      { property: "og:description", content: "Create a room, invite friends, and race through the same words in real time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TypeAndTally,
});

function TypeAndTally() {
  const [view, setView] = useState<"home" | "waiting" | "race" | "results">("home");
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>(SAMPLE_PLAYERS);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [duration, setDuration] = useState(60);
  const [passageChoice, setPassageChoice] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [typed, setTyped] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [countdown, setCountdown] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isCloudRoom = Boolean(room?.id && room.id !== "sample");
  const passage = room?.passage ?? PASSAGES[passageChoice];
  const correctChars = useMemo(() => typed.split("").filter((char, index) => char === passage[index]).length, [typed, passage]);
  const errors = Math.max(0, typed.length - correctChars);
  const progress = Math.min(100, Math.round((typed.length / passage.length) * 100));
  const elapsedSeconds = startedAt ? Math.max(1, Math.floor((Date.now() - startedAt) / 1000)) : 1;
  const wpm = Math.round((correctChars / 5 / elapsedSeconds) * 60) || 0;
  const accuracy = typed.length ? Math.round((correctChars / typed.length) * 100) : 100;

  useEffect(() => {
    if (!room?.id || room.id === "sample") return;
    let active = true;
    const loadRoom = async () => {
      const [{ data: nextRoom }, { data: nextPlayers }] = await Promise.all([
        supabase.from("typing_rooms").select("*").eq("id", room.id).single(),
        supabase.from("typing_players").select("*").eq("room_id", room.id).order("joined_at"),
      ]);
      if (!active) return;
      if (nextRoom) setRoom(nextRoom as Room);
      if (nextPlayers) setPlayers(nextPlayers as Player[]);
    };
    void loadRoom();
    const channel = supabase
      .channel(`typing-room-${room.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "typing_rooms", filter: `id=eq.${room.id}` }, () => void loadRoom())
      .on("postgres_changes", { event: "*", schema: "public", table: "typing_players", filter: `room_id=eq.${room.id}` }, () => void loadRoom())
      .subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [room?.id]);

  useEffect(() => {
    if (view !== "race" || !room) return;
    setCountdown(3);
    setStartedAt(Date.now() + 3000);
    const timer = window.setInterval(() => {
      setCountdown((value) => value === null ? null : value <= 1 ? null : value - 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [view, room?.id]);

  useEffect(() => {
    if (view !== "race" || !startedAt || countdown !== null) return;
    const timer = window.setInterval(() => {
      const left = Math.max(0, (room?.duration_seconds ?? duration) - Math.floor((Date.now() - startedAt) / 1000));
      setSecondsLeft(left);
      if (left === 0) finishRace();
    }, 500);
    return () => window.clearInterval(timer);
  }, [view, startedAt, countdown, room?.duration_seconds, duration]);

  useEffect(() => {
    if (notice) {
      const timer = window.setTimeout(() => setNotice(""), 3500);
      return () => window.clearTimeout(timer);
    }
  }, [notice]);

  const resetToHome = () => {
    setView("home"); setRoom(null); setCurrentPlayer(null); setTyped(""); setNotice(""); setPlayers(SAMPLE_PLAYERS);
  };

  const createRoom = async () => {
    const name = displayName.trim() || "Quick Fingers";
    setBusy(true);
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const { data: createdRoom, error: roomError } = await supabase.from("typing_rooms").insert({ code, host_name: name, duration_seconds: duration, passage: PASSAGES[passageChoice], status: "waiting" }).select().single();
    if (roomError || !createdRoom) { setNotice("The room got a little tangled. Try again."); setBusy(false); return; }
    const { data: createdPlayer } = await supabase.from("typing_players").insert({ room_id: createdRoom.id, display_name: name, is_host: true, is_ready: true }).select().single();
    setRoom(createdRoom as Room); setCurrentPlayer(createdPlayer as Player); setPlayers(createdPlayer ? [createdPlayer as Player] : []); setView("waiting"); setBusy(false);
  };

  const joinRoom = async () => {
    const name = displayName.trim() || "Friendly Rival";
    const code = roomCode.trim().toUpperCase();
    if (!code) { setNotice("Pop in a room code first."); return; }
    setBusy(true);
    const { data: foundRoom } = await supabase.from("typing_rooms").select("*").eq("code", code).eq("status", "waiting").maybeSingle();
    if (!foundRoom) { setNotice("That room is hiding. Check the code and try again."); setBusy(false); return; }
    const { data: joinedPlayer } = await supabase.from("typing_players").insert({ room_id: foundRoom.id, display_name: name, is_host: false, is_ready: false }).select().single();
    setRoom(foundRoom as Room); setCurrentPlayer(joinedPlayer as Player); setView("waiting"); setBusy(false);
  };

  const updatePlayer = async (updates: Partial<Player>) => {
    if (!currentPlayer || !isCloudRoom) return;
    await supabase.from("typing_players").update(updates).eq("id", currentPlayer.id);
  };

  const toggleReady = async () => {
    const nextReady = !currentPlayer?.is_ready;
    setCurrentPlayer((player) => player ? { ...player, is_ready: nextReady } : player);
    setPlayers((list) => list.map((player) => player.id === currentPlayer?.id ? { ...player, is_ready: nextReady } : player));
    await updatePlayer({ is_ready: nextReady });
  };

  const startRace = async () => {
    if (!room) return;
    setRoom({ ...room, status: "racing" }); setView("race");
    if (isCloudRoom) await supabase.from("typing_rooms").update({ status: "racing" }).eq("id", room.id);
  };

  const syncProgress = async (nextTyped: string) => {
    setTyped(nextTyped);
    const nextCorrect = nextTyped.split("").filter((char, index) => char === passage[index]).length;
    const nextProgress = Math.min(100, Math.round((nextTyped.length / passage.length) * 100));
    const nextWpm = Math.round((nextCorrect / 5 / Math.max(1, elapsedSeconds)) * 60) || 0;
    const nextAccuracy = nextTyped.length ? Math.round((nextCorrect / nextTyped.length) * 100) : 100;
    setPlayers((list) => list.map((player) => player.id === currentPlayer?.id ? { ...player, progress: nextProgress, wpm: nextWpm, accuracy: nextAccuracy } : player));
    await updatePlayer({ progress: nextProgress, wpm: nextWpm, accuracy: nextAccuracy });
    if (nextTyped.length >= passage.length) finishRace();
  };

  const finishRace = async () => {
    if (view !== "race") return;
    await updatePlayer({ progress: 100, wpm, accuracy, finished: true });
    setView("results");
  };

  const copyRoomLink = async () => {
    if (!room) return;
    await navigator.clipboard?.writeText(`${window.location.origin}/?room=${room.code}`);
    setNotice("Room link copied — send it to your fastest friends.");
  };

  if (view === "home") return <HomeView displayName={displayName} setDisplayName={setDisplayName} roomCode={roomCode} setRoomCode={setRoomCode} duration={duration} setDuration={setDuration} passageChoice={passageChoice} setPassageChoice={setPassageChoice} createRoom={createRoom} joinRoom={joinRoom} busy={busy} notice={notice} />;
  if (view === "waiting" && room) return <WaitingView room={room} players={players} currentPlayer={currentPlayer} toggleReady={toggleReady} startRace={startRace} copyRoomLink={copyRoomLink} onBack={resetToHome} notice={notice} />;
  if (view === "race" && room) return <RaceView room={room} players={players} currentPlayer={currentPlayer} passage={passage} typed={typed} inputRef={inputRef} onType={syncProgress} correctChars={correctChars} errors={errors} progress={progress} wpm={wpm} accuracy={accuracy} secondsLeft={secondsLeft} countdown={countdown} onBack={resetToHome} />;
  return <ResultsView room={room} players={players} currentPlayer={currentPlayer} onRaceAgain={() => { setTyped(""); setView("race"); }} onBack={resetToHome} />;
}

function Shell({ children, notice }: { children: React.ReactNode; notice?: string }) {
  return <main className="min-h-screen overflow-hidden px-4 py-5 text-ink sm:px-8 sm:py-8"><div className="mx-auto max-w-6xl">{children}</div>{notice ? <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 scribble-border bg-yellow px-5 py-3 font-body font-bold paper-shadow-small">{notice}</div> : null}</main>;
}

function Brand() {
  return <div className="flex items-center gap-3"><div className="grid h-12 w-12 rotate-[-7deg] place-items-center scribble-border bg-red text-primary-foreground paper-shadow-small"><Zap size={25} strokeWidth={3} /></div><div><p className="font-heading text-3xl font-bold leading-none">Type &amp; Tally</p><p className="font-body text-sm text-ink-soft">a little race on paper</p></div></div>;
}

function HomeView(props: { displayName: string; setDisplayName: (value: string) => void; roomCode: string; setRoomCode: (value: string) => void; duration: number; setDuration: (value: number) => void; passageChoice: number; setPassageChoice: (value: number) => void; createRoom: () => void; joinRoom: () => void; busy: boolean; notice: string }) {
  return <Shell notice={props.notice}><header className="flex items-center justify-between"><Brand /><div className="hidden items-center gap-2 font-body text-sm text-ink-soft sm:flex"><span className="inline-block h-3 w-3 rounded-full bg-green" /> live rooms, no waiting around</div></header><section className="grid items-center gap-12 pb-8 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pt-24"><div className="relative"><div className="absolute -left-2 -top-10 rotate-[-8deg] font-heading text-xl text-blue">ready, set, type!</div><h1 className="max-w-2xl font-heading text-6xl font-bold leading-[0.92] tracking-tight sm:text-8xl">Make words <span className="sketch-underline">move.</span></h1><p className="mt-8 max-w-xl text-2xl leading-tight text-ink-soft">A friendly typing race for people who like their competition live, lightweight, and a little bit wonky.</p><div className="mt-8 flex flex-wrap gap-4 text-lg"><span className="flex items-center gap-2"><Wifi size={19} className="text-green" /> Cloud synced</span><span className="flex items-center gap-2"><Users size={19} className="text-blue" /> Up to 8 racers</span></div></div><div className="relative"><div className="absolute -right-2 -top-7 z-10 rotate-[6deg] bg-yellow px-5 py-2 font-heading text-xl paper-shadow-small">pick a lane ↓</div><div className="scribble-border rotate-[1deg] bg-card p-6 paper-shadow sm:p-8"><label className="font-heading text-2xl font-bold">Your name</label><input value={props.displayName} onChange={(event) => props.setDisplayName(event.target.value)} placeholder="e.g. speedy sam" className="mt-3 h-14 w-full border-b-4 border-ink bg-transparent px-2 text-xl outline-none placeholder:text-ink-soft/50 focus:border-blue" /><div className="my-8 border-t-2 border-dashed border-ink/40" /><h2 className="font-heading text-3xl font-bold">Start a new race</h2><p className="mt-1 text-ink-soft">Choose the rules, then invite your people.</p><div className="mt-5 grid grid-cols-2 gap-3"><label className="font-body font-bold">Time<select value={props.duration} onChange={(event) => props.setDuration(Number(event.target.value))} className="mt-1 h-12 w-full border-2 border-ink bg-paper px-3 outline-none focus:ring-2 focus:ring-blue"><option value={30}>30 sec</option><option value={60}>60 sec</option><option value={120}>2 min</option></select></label><label className="font-body font-bold">Text<select value={props.passageChoice} onChange={(event) => props.setPassageChoice(Number(event.target.value))} className="mt-1 h-12 w-full border-2 border-ink bg-paper px-3 outline-none focus:ring-2 focus:ring-blue"><option value={0}>Little steps</option><option value={1}>Good race</option><option value={2}>Messy sketches</option></select></label></div><Button onClick={props.createRoom} disabled={props.busy} className="mt-6 w-full" size="lg"><Play size={20} fill="currentColor" /> {props.busy ? "Making room..." : "Create a room"}</Button><div className="my-6 flex items-center gap-3 text-sm text-ink-soft"><span className="h-px flex-1 bg-ink/25" /> or join a room <span className="h-px flex-1 bg-ink/25" /></div><div className="flex gap-3"><input value={props.roomCode} onChange={(event) => props.setRoomCode(event.target.value.toUpperCase())} placeholder="ROOM CODE" maxLength={6} className="h-12 min-w-0 flex-1 border-2 border-ink bg-paper px-4 text-center font-heading text-xl uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue" /><Button variant="outline" onClick={props.joinRoom} disabled={props.busy}><ArrowRight size={20} /> Join</Button></div></div></div></section><div className="flex items-center justify-center gap-3 text-center font-heading text-xl text-ink-soft"><Sparkles size={20} className="text-red" /> Your keyboard is invited. <Sparkles size={20} className="text-red" /></div></Shell>;
}

function RoomHeader({ room, onBack }: { room: Room; onBack: () => void }) {
  return <header className="flex flex-wrap items-center justify-between gap-4"><Brand /><div className="flex items-center gap-3"><span className="scribble-border bg-card px-4 py-2 font-heading text-xl font-bold">room / {room.code}</span><Button variant="ghost" size="icon" onClick={onBack} aria-label="Leave room"><ArrowLeft /></Button></div></header>;
}

function WaitingView({ room, players, currentPlayer, toggleReady, startRace, copyRoomLink, onBack, notice }: { room: Room; players: Player[]; currentPlayer: Player | null; toggleReady: () => void; startRace: () => void; copyRoomLink: () => void; onBack: () => void; notice: string }) {
  const allReady = players.length === 1 || players.every((player) => player.is_ready);
  return <Shell notice={notice}><RoomHeader room={room} onBack={onBack} /><div className="grid gap-8 pb-10 pt-14 lg:grid-cols-[0.85fr_1.15fr]"><div><div className="relative rotate-[-2deg] bg-yellow p-7 paper-shadow"><div className="absolute -top-3 left-1/2 h-6 w-20 -translate-x-1/2 rotate-2 bg-red/70" /><p className="text-sm uppercase tracking-widest text-ink-soft">your room code</p><p className="mt-2 font-heading text-7xl font-bold tracking-widest">{room.code}</p><Button variant="ghost" className="mt-3 px-0" onClick={copyRoomLink}><Link2 size={18} /> copy invite link</Button></div><div className="mt-12 rotate-[2deg] scribble-border bg-card p-6 paper-shadow"><p className="font-heading text-2xl font-bold">Race notes</p><ul className="mt-3 space-y-2 text-ink-soft"><li>✎ Everyone types the same passage.</li><li>✎ Fast hands are nice. Calm hands are nicer.</li><li>✎ The host starts when everyone is ready.</li></ul></div></div><div className="scribble-border bg-card p-6 paper-shadow sm:p-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-heading text-4xl font-bold">Who is here?</p><p className="text-ink-soft">{players.length} {players.length === 1 ? "racer is" : "racers are"} in the notebook.</p></div><span className="flex items-center gap-2 text-green"><Wifi size={19} /> live</span></div><div className="mt-6 space-y-3">{players.map((player, index) => <div key={player.id} className={`flex items-center gap-4 border-b-2 border-dashed border-ink/20 pb-4 ${index % 2 ? "rotate-[1deg]" : "rotate-[-1deg]"}`}><div className="grid h-12 w-12 shrink-0 place-items-center scribble-border bg-secondary font-heading text-xl font-bold">{player.display_name.slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate font-heading text-2xl font-bold">{player.display_name} {player.is_host ? <Crown size={18} className="inline text-red" /> : null}</p><p className="text-sm text-ink-soft">{player.is_host ? "host" : "racer"}</p></div><span className={player.is_ready ? "flex items-center gap-1 font-bold text-green" : "text-ink-soft"}>{player.is_ready ? <><Check size={20} /> ready!</> : "warming up..."}</span></div>)}</div><div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button variant={currentPlayer?.is_ready ? "secondary" : "outline"} onClick={toggleReady} className="flex-1">{currentPlayer?.is_ready ? <><Check size={20} /> I’m ready</> : "Mark me ready"}</Button>{currentPlayer?.is_host ? <Button onClick={startRace} disabled={!allReady} className="flex-1"><Flag size={20} /> {allReady ? "Start the race" : "Waiting on racers"}</Button> : null}</div></div></div></Shell>;
}

function RaceView({ room, players, currentPlayer, passage, typed, inputRef, onType, correctChars, errors, progress, wpm, accuracy, secondsLeft, countdown, onBack }: { room: Room; players: Player[]; currentPlayer: Player | null; passage: string; typed: string; inputRef: React.RefObject<HTMLInputElement | null>; onType: (value: string) => void; correctChars: number; errors: number; progress: number; wpm: number; accuracy: number; secondsLeft: number; countdown: number | null; onBack: () => void }) {
  return <Shell><header className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-4"><Brand /><span className="hidden border-l-2 border-ink/20 pl-4 font-heading text-xl sm:block">the great letter dash</span></div><div className="flex items-center gap-3"><div className="flex items-center gap-2 scribble-border bg-card px-4 py-2 font-heading text-2xl font-bold"><Timer size={20} className="text-red" /> {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:{String(secondsLeft % 60).padStart(2, "0")}</div><Button variant="ghost" size="icon" onClick={onBack} aria-label="Exit race"><ArrowLeft /></Button></div></header><div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]"><section className="relative"><div className="mb-3 flex items-center justify-between font-heading text-xl"><span>room / {room.code}</span><span className="flex items-center gap-2 text-sm text-ink-soft"><Users size={17} /> {players.length} typing</span></div><div className="relative min-h-[380px] cursor-text scribble-border bg-card p-6 paper-lines paper-shadow sm:p-10" onClick={() => inputRef.current?.focus()}><div className="font-heading text-3xl leading-[1.6] sm:text-4xl">{passage.split("").map((char, index) => { const typedChar = typed[index]; const state = typedChar === undefined ? "untyped" : typedChar === char ? "correct" : "wrong"; return <span key={`${char}-${index}`} className={state === "correct" ? "text-blue" : state === "wrong" ? "bg-red text-primary-foreground" : index === typed.length ? "border-b-4 border-red text-ink" : "text-ink-soft/60"}>{char}</span>; })}</div><input ref={inputRef} value={typed} onChange={(event) => onType(event.target.value)} aria-label="Type the passage" autoFocus className="absolute inset-0 h-full w-full cursor-text opacity-0" /></div><div className="mt-6 grid grid-cols-3 gap-3"><Stat label="speed" value={`${wpm}`} suffix="wpm" /><Stat label="accuracy" value={`${accuracy}`} suffix="%" /><Stat label="mistakes" value={`${errors}`} suffix="chars" /></div>{countdown !== null ? <div className="absolute inset-0 z-20 grid place-items-center bg-paper/90"><div className="text-center"><p className="font-heading text-2xl text-ink-soft">get your fingers ready</p><p className="font-heading text-9xl font-bold text-red">{countdown}</p></div></div> : null}</section><section className="scribble-border bg-card p-6 paper-shadow sm:p-8"><div className="flex items-end justify-between"><div><p className="font-heading text-3xl font-bold">Live board</p><p className="text-ink-soft">tiny updates, big drama</p></div><span className="h-4 w-4 rounded-full bg-green" title="Live" /></div><div className="mt-7 space-y-6">{players.map((player, index) => <div key={player.id} className={player.id === currentPlayer?.id ? "rotate-[-1deg]" : "rotate-[1deg]"}><div className="flex items-center justify-between gap-3"><span className="flex min-w-0 items-center gap-2 truncate font-heading text-xl font-bold">{player.is_host ? <Crown size={17} className="shrink-0 text-red" /> : null}{player.display_name}{player.id === currentPlayer?.id ? <span className="text-sm text-blue">(you)</span> : null}</span><span className="shrink-0 text-sm font-bold">{player.finished ? "done!" : `${player.wpm} wpm`}</span></div><div className="mt-2 h-5 border-2 border-ink bg-paper p-0.5"><div className={`h-full ${index === 0 ? "bg-red" : "bg-blue"} transition-[width] duration-300`} style={{ width: `${player.id === currentPlayer?.id ? progress : player.progress}%` }} /></div><div className="mt-1 flex justify-between text-sm text-ink-soft"><span>{player.accuracy}% accurate</span><span>{player.id === currentPlayer?.id ? progress : player.progress}%</span></div></div>)}</div><div className="mt-10 border-t-2 border-dashed border-ink/30 pt-5 text-center font-heading text-xl text-ink-soft">Keep going. The finish line is a keypress away.</div></section></div></Shell>;
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix: string }) { return <div className="scribble-border bg-yellow/60 p-3 text-center"><p className="text-sm uppercase tracking-widest text-ink-soft">{label}</p><p className="font-heading text-3xl font-bold">{value} <span className="text-base font-normal">{suffix}</span></p></div>; }

function ResultsView({ room, players, currentPlayer, onRaceAgain, onBack }: { room: Room | null; players: Player[]; currentPlayer: Player | null; onRaceAgain: () => void; onBack: () => void }) {
  const sorted = [...players].sort((a, b) => b.wpm - a.wpm);
  return <Shell><header className="flex items-center justify-between"><Brand /><Button variant="ghost" onClick={onBack}><ArrowLeft size={19} /> Home</Button></header><section className="mx-auto max-w-3xl pb-12 pt-16"><div className="relative mb-10 text-center"><Sparkles className="absolute -left-2 top-0 text-red" /><p className="font-heading text-xl text-blue">room / {room?.code ?? "solo"}</p><h1 className="mt-2 font-heading text-6xl font-bold sm:text-8xl">Final tally</h1><p className="mt-3 text-xl text-ink-soft">The ink is dry. Here’s how the fingers flew.</p></div><div className="scribble-border rotate-[1deg] bg-card p-5 paper-shadow sm:p-8"><div className="flex items-center justify-between border-b-4 border-ink pb-4"><h2 className="font-heading text-3xl font-bold">🏆 race results</h2><span className="font-heading text-xl text-ink-soft">{room?.duration_seconds ?? 60}s sprint</span></div><div className="mt-5 space-y-3">{sorted.map((player, index) => <div key={player.id} className={`grid grid-cols-[42px_1fr_auto] items-center gap-3 border-b border-dashed border-ink/25 px-2 py-4 sm:grid-cols-[52px_1fr_110px_100px] ${player.id === currentPlayer?.id ? "bg-yellow/50" : ""}`}><span className="font-heading text-3xl font-bold">{index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}</span><div><p className="font-heading text-2xl font-bold">{player.display_name} {player.id === currentPlayer?.id ? <span className="text-sm text-blue">(you)</span> : null}</p><p className="text-sm text-ink-soft">{player.finished ? "finished the passage" : "kept a steady pace"}</p></div><span className="font-heading text-2xl font-bold">{player.wpm} <small className="text-base font-normal">wpm</small></span><span className="hidden text-right text-ink-soft sm:block">{player.accuracy}% accuracy</span></div>)}</div></div><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Button onClick={onRaceAgain}><RotateCcw size={19} /> Race again</Button><Button variant="outline" onClick={onBack}><ArrowLeft size={19} /> New room</Button><Button variant="secondary" onClick={() => void navigator.clipboard?.writeText("I just raced on Type & Tally!")}><Clipboard size={19} /> Share result</Button></div></section></Shell>;
}