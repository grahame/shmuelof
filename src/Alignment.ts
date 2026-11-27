import React from "react";

// Produced by tools/align/align.py; see tools/align/README.md
export type VerseTiming = {
    v: number;
    start: number;
    end: number;
    conf: number | null;
    /** in the verse numbering but not in the text or the recording (e.g. Joshua 21:36-37) */
    absent?: boolean;
};

export type Alignment = {
    book: string;
    chapter: number;
    duration: number;
    textVersion: string;
    verses: Array<VerseTiming>;
};

/** Must match slug() in tools/align/align.py */
export const alignmentSlug = (book: string, chapter: number) => `${book.toLowerCase().replace(/ /g, "_")}-${chapter}`;

export const useAlignment = (book: string, chapter: number): Alignment | undefined => {
    const [alignment, setAlignment] = React.useState<Alignment>();
    React.useEffect(() => {
        let cancelled = false;
        setAlignment(undefined);
        const base = import.meta.env.BASE_URL.replace(/\/?$/, "/");
        fetch(`${base}alignments/${alignmentSlug(book, chapter)}.json`)
            .then((r) => (r.ok ? r.json() : undefined))
            .then((a) => {
                if (!cancelled) setAlignment(a);
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [book, chapter]);
    return alignment;
};

/** Verse (1-based) playing at time t, or undefined between/outside verses. */
export const verseAt = (alignment: Alignment, t: number) => {
    for (const v of alignment.verses) {
        if (t >= v.start && t < v.end) return v.v;
    }
    return undefined;
};

export type Passage = { from: number; to: number };

export const parsePassage = (s: string | undefined): Passage | undefined => {
    if (!s) return undefined;
    const m = /^(\d+)(?:-(\d+))?$/.exec(s);
    if (!m) return undefined;
    const from = parseInt(m[1]);
    const to = m[2] ? parseInt(m[2]) : from;
    return { from: Math.min(from, to), to: Math.max(from, to) };
};

export const passageToString = (p: Passage) => (p.from === p.to ? `${p.from}` : `${p.from}-${p.to}`);

export const passageTimes = (alignment: Alignment, p: Passage) => ({
    start: alignment.verses[p.from - 1].start,
    end: alignment.verses[p.to - 1].end,
});

const encodeWav = (buffer: AudioBuffer, start: number, end: number): Blob => {
    const rate = buffer.sampleRate;
    const s0 = Math.max(0, Math.floor(start * rate));
    const s1 = Math.min(buffer.length, Math.ceil(end * rate));
    const data = buffer.getChannelData(0).subarray(s0, s1);
    const out = new DataView(new ArrayBuffer(44 + data.length * 2));
    const str = (o: number, s: string) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
    str(0, "RIFF");
    out.setUint32(4, 36 + data.length * 2, true);
    str(8, "WAVE");
    str(12, "fmt ");
    out.setUint32(16, 16, true);
    out.setUint16(20, 1, true); // PCM
    out.setUint16(22, 1, true); // mono
    out.setUint32(24, rate, true);
    out.setUint32(28, rate * 2, true);
    out.setUint16(32, 2, true);
    out.setUint16(34, 16, true);
    str(36, "data");
    out.setUint32(40, data.length * 2, true);
    for (let i = 0; i < data.length; i++) {
        const x = Math.max(-1, Math.min(1, data[i]));
        out.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true);
    }
    return new Blob([out], { type: "audio/wav" });
};

/** Decode the chapter recording and save the passage as a WAV file. */
export const downloadClip = async (audioUrl: string, alignment: Alignment, p: Passage) => {
    const { start, end } = passageTimes(alignment, p);
    const bytes = await (await fetch(audioUrl)).arrayBuffer();
    const ctx = new AudioContext();
    try {
        const buffer = await ctx.decodeAudioData(bytes);
        const blob = encodeWav(buffer, start, end);
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${alignment.book} ${alignment.chapter}.${passageToString(p)} (Shmuelof).wav`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    } finally {
        ctx.close();
    }
};
