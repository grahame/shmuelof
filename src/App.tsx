import React from "react";
import { Sefaria } from "./Sefaria";
import {
    Alignment,
    Passage,
    downloadClip,
    parsePassage,
    passageTimes,
    passageToString,
    useAlignment,
    verseAt,
} from "./Alignment";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { HashRouter, Route, Routes, useNavigate, useParams } from "react-router-dom";
import {
    faAngleDoubleLeft,
    faAngleDoubleRight,
    faTachometerAlt,
    faGripLines,
    faPlay,
    faPause,
    faRepeat,
    faDownload,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import {
    Button,
    ButtonToolbar,
    ButtonToggle,
    ButtonGroup,
    Dropdown,
    DropdownToggle,
    DropdownMenu,
    DropdownItem,
    Container,
    Row,
    Col,
} from "reactstrap";
import { Typeahead } from "react-bootstrap-typeahead";
import "react-bootstrap-typeahead/css/Typeahead.css";
import "./App.css";
import URLs from "./urls.json";

enum PlaybackRate {
    Very_Slow,
    Slow,
    Normal,
    Fast,
    Very_Fast,
}

type ControlsProps = {
    displayInterlinear: boolean;
    setDisplayInterlinear: any;
    selectedChapter: number;
    setSelectedChapter: any;
    audioRef: React.RefObject<HTMLAudioElement | null>;
    onLoadedMetadata: () => void;
    passageBar: React.ReactNode;
};

type BookLabel = {
    id: number;
    label: string;
};

const MakeLabel = (idx: number): BookLabel => {
    var url = URLs.urls[idx];
    return {
        id: idx,
        label: `${url.book} ${url.chapter}`,
    };
};

const BooksAndChapters = () => {
    var books = new Array<BookLabel>();
    for (const [idx] of URLs.urls.entries()) {
        books.push(MakeLabel(idx));
    }
    return books;
};

const slugToChapter = (slug: string | undefined) => {
    if (slug === undefined) {
        return undefined;
    }
    const [book, chapterString] = slug.split("-");
    const chapter = parseInt(chapterString);
    if (isNaN(chapter)) {
        return undefined;
    }
    for (const [idx, url] of URLs.urls.entries()) {
        if (url.book.toLowerCase() === book && url.chapter === chapter) {
            return idx;
        }
    }
    return undefined;
};

const chapterToSlug = (idx: number) => {
    var url = URLs.urls[idx];
    return url.book.toLowerCase() + "-" + url.chapter;
};

const ChapterSelector: React.FC<{ value: number; set: any }> = ({ value, set }) => {
    const [selected, setSelected] = React.useState<Array<BookLabel>>([MakeLabel(value)]);
    const navigate = useNavigate();

    // this is ugly: while someone is typing, selected from the Typeahead
    // control goes to `undefined`. we need to allow this for the internal
    // operation of the control. however, if `value` changes for some
    // external reason then we need to update the selection.
    React.useEffect(() => {
        if (selected && selected.length > 0 && selected[0].id !== value) {
            setSelected([MakeLabel(value)]);
        }
    }, [value, selected]);

    const maybeNav = (selected: any) => {
        const labels = selected as BookLabel[];
        setSelected(labels);
        if (labels.length === 0) {
            return;
        }
        navigate("/" + chapterToSlug(labels[0].id));
    };

    return (
        <Typeahead
            id="books-and-chapters"
            inputProps={{ className: "bg-dark text-light" }}
            options={BooksAndChapters()}
            placeholder="Choose Tanakh chapter..."
            selected={selected}
            onChange={maybeNav}
        />
    );
};

const PlaybackToName = (rate: PlaybackRate) => {
    // horrible code here due to IE11 support
    if (rate === PlaybackRate.Very_Fast) {
        return "Very Fast";
    }
    if (rate === PlaybackRate.Fast) {
        return "Fast";
    }
    if (rate === PlaybackRate.Slow) {
        return "Slow";
    }
    if (rate === PlaybackRate.Very_Slow) {
        return "Very Slow";
    }
    return "Normal";
};

const Controls: React.FC<ControlsProps> = ({
    displayInterlinear,
    setDisplayInterlinear,
    selectedChapter,
    setSelectedChapter,
    audioRef,
    onLoadedMetadata,
    passageBar,
}) => {
    const [playbackRate, setPlaybackRate] = React.useState<PlaybackRate>(PlaybackRate.Normal);
    const navigate = useNavigate();

    const applyPlayback = () => {
        if (!audioRef.current) {
            return;
        }
        var rate: number = 1.0;
        if (playbackRate === PlaybackRate.Very_Slow) {
            rate = 0.5;
        } else if (playbackRate === PlaybackRate.Slow) {
            rate = 0.75;
        } else if (playbackRate === PlaybackRate.Fast) {
            rate = 1.25;
        } else if (playbackRate === PlaybackRate.Very_Fast) {
            rate = 1.5;
        }
        audioRef.current.playbackRate = rate;
    };
    // apply the current playback rate to the ref if it exists
    applyPlayback();

    const RateToggle: React.FC<{ value: PlaybackRate }> = ({ value }) => {
        const name = PlaybackToName(value);
        return (
            <>
                <DropdownItem
                    className={playbackRate === value ? "active" : undefined}
                    onClick={() => setPlaybackRate(value)}
                >
                    {name}
                </DropdownItem>
            </>
        );
    };

    const RateControl: React.FC = () => {
        const [isOpen, setIsOpen] = React.useState<boolean>(false);

        return (
            <Dropdown isOpen={isOpen} toggle={() => setIsOpen(!isOpen)}>
                <DropdownToggle caret>
                    <FontAwesomeIcon icon={faTachometerAlt} /> {PlaybackToName(playbackRate)}
                </DropdownToggle>
                <DropdownMenu>
                    <RateToggle value={PlaybackRate.Very_Slow} />
                    <RateToggle value={PlaybackRate.Slow} />
                    <RateToggle value={PlaybackRate.Normal} />
                    <RateToggle value={PlaybackRate.Fast} />
                    <RateToggle value={PlaybackRate.Very_Fast} />
                </DropdownMenu>
            </Dropdown>
        );
    };

    const InterlinearToggle: React.FC = () => {
        return (
            <>
                <ButtonToggle
                    className={displayInterlinear ? "active" : undefined}
                    onClick={() => setDisplayInterlinear(!displayInterlinear)}
                >
                    <FontAwesomeIcon icon={faGripLines} /> Interlinear
                </ButtonToggle>
            </>
        );
    };

    const SetOffset = (offset: number) => {
        if (selectedChapter + offset < 0) {
            return;
        }
        if (selectedChapter + offset >= URLs.urls.length) {
            return;
        }
        navigate("/" + chapterToSlug(selectedChapter + offset));
    };

    return (
        <>
            <div className="fixed-top bg-dark text-light">
                <Row>
                    <Col xs={{ size: 10, offset: 1 }}>
                        <ButtonToolbar>
                            <ButtonGroup className="mr-2">
                                <InterlinearToggle />
                            </ButtonGroup>
                            <ButtonGroup className="mr-2">
                                <RateControl />
                            </ButtonGroup>
                            <ButtonGroup>
                                <Button disabled={selectedChapter === 0} onClick={() => SetOffset(-1)}>
                                    <FontAwesomeIcon icon={faAngleDoubleLeft} />
                                </Button>
                                <ChapterSelector value={selectedChapter} set={setSelectedChapter} />
                                <Button disabled={selectedChapter >= URLs.urls.length - 1} onClick={() => SetOffset(1)}>
                                    <FontAwesomeIcon icon={faAngleDoubleRight} />
                                </Button>
                            </ButtonGroup>
                        </ButtonToolbar>
                    </Col>
                </Row>
                <Row>
                    <Col xs={{ size: 10, offset: 1 }}>
                        <audio
                            id="playback-control"
                            ref={audioRef}
                            controls
                            onCanPlay={() => applyPlayback()}
                            onLoadedMetadata={onLoadedMetadata}
                            src={URLs.urls[selectedChapter].url}
                        />
                    </Col>
                </Row>
                {passageBar}
            </div>
        </>
    );
};

const Footer: React.FC = () => {
    return (
        <>
            <hr />
            <Row>
                <p>
                    English and Hebrew text from the Bible/Tanakh is taken from{" "}
                    <a target="_other" href="https://www.sefaria.org">
                        Sefaria
                    </a>
                    . Hebrew text is displayed using the{" "}
                    <a target="_other" href="https://www.sbl-site.org/educational/BiblicalFonts_SBLHebrew.aspx">
                        Society of Biblical Literature Hebrew font
                    </a>
                    . Recordings were downloaded from <a href="https://archive.org/">archive.org</a> - they were
                    entrusted to the Carmelites. You can find out more about Abraham Shmuelof on the site of{" "}
                    <a target="_other" href="http://individual.utoronto.ca/mfkolarcik/AbrahamShmuelof.html">
                        Michael Kolarcik
                    </a>
                    . This software was developed by Grahame Bowland, and is open source:{" "}
                    <a href="https://github.com/grahame/shmuelof/">github.com/grahame/shmuelof</a>
                </p>
            </Row>
        </>
    );
};

type PassageBarProps = {
    alignment: Alignment;
    passage: Passage;
    audioUrl: string;
    playing: boolean;
    loop: boolean;
    setLoop: (loop: boolean) => void;
    play: () => void;
    pause: () => void;
    clear: () => void;
};

const PassageBar: React.FC<PassageBarProps> = ({
    alignment,
    passage,
    audioUrl,
    playing,
    loop,
    setLoop,
    play,
    pause,
    clear,
}) => {
    const [downloading, setDownloading] = React.useState(false);
    const { start, end } = passageTimes(alignment, passage);
    const download = () => {
        setDownloading(true);
        downloadClip(audioUrl, alignment, passage)
            .catch((e) => alert(`Unable to create clip: ${e}`))
            .finally(() => setDownloading(false));
    };
    const label = `${alignment.book} ${alignment.chapter}:${passageToString(passage).replace("-", "–")}`;
    return (
        <Row className="passage-bar">
            <Col xs={{ size: 10, offset: 1 }}>
                <ButtonToolbar>
                    <span className="passage-label me-2">
                        {label} <small style={{ opacity: 0.7 }}>({(end - start).toFixed(1)} s)</small>
                    </span>
                    <ButtonGroup className="me-2">
                        <Button size="sm" onClick={playing ? pause : play}>
                            <FontAwesomeIcon icon={playing ? faPause : faPlay} /> {playing ? "Pause" : "Play passage"}
                        </Button>
                        <ButtonToggle size="sm" className={loop ? "active" : undefined} onClick={() => setLoop(!loop)}>
                            <FontAwesomeIcon icon={faRepeat} /> Loop
                        </ButtonToggle>
                        <Button size="sm" disabled={downloading} onClick={download}>
                            <FontAwesomeIcon icon={faDownload} /> {downloading ? "Preparing…" : "Download clip"}
                        </Button>
                    </ButtonGroup>
                    <ButtonGroup>
                        <Button size="sm" title="Clear selection" onClick={clear}>
                            <FontAwesomeIcon icon={faXmark} />
                        </Button>
                    </ButtonGroup>
                </ButtonToolbar>
            </Col>
        </Row>
    );
};

const ScripturePage: React.FC = () => {
    const [displayInterlinear, setDisplayInterlinear] = React.useState<boolean>(false);
    const { slug, verses } = useParams();
    const navigate = useNavigate();

    const selectedChapter = slugToChapter(slug);
    const setSelectedChapter = React.useCallback((idx: number) => navigate("/" + chapterToSlug(idx)), [navigate]);

    React.useEffect(() => {
        if (slug === undefined) {
            setSelectedChapter(0);
        }
    }, [slug, setSelectedChapter]);

    if (selectedChapter === undefined) {
        return (
            <>
                <p>One moment...</p>
            </>
        );
    }
    return (
        <ChapterView
            key={selectedChapter}
            selectedChapter={selectedChapter}
            setSelectedChapter={setSelectedChapter}
            displayInterlinear={displayInterlinear}
            setDisplayInterlinear={setDisplayInterlinear}
            verses={verses}
            navigate={navigate}
        />
    );
};

type ChapterViewProps = {
    selectedChapter: number;
    setSelectedChapter: (idx: number) => void;
    displayInterlinear: boolean;
    setDisplayInterlinear: (v: boolean) => void;
    verses: string | undefined;
    navigate: ReturnType<typeof useNavigate>;
};

const ChapterView: React.FC<ChapterViewProps> = ({
    selectedChapter,
    setSelectedChapter,
    displayInterlinear,
    setDisplayInterlinear,
    verses,
    navigate,
}) => {
    const audioRef = React.useRef<HTMLAudioElement>(null);
    const [verseCount, setVerseCount] = React.useState<number>();
    const [currentVerse, setCurrentVerse] = React.useState<number>();
    const [passagePlaying, setPassagePlaying] = React.useState(false);
    const [loop, setLoop] = React.useState(false);
    const url = URLs.urls[selectedChapter];
    const rawAlignment = useAlignment(url.book, url.chapter);
    // Only use the alignment if it matches the text we're displaying.
    const alignment = rawAlignment && verseCount === rawAlignment.verses.length ? rawAlignment : undefined;
    React.useEffect(() => {
        if (rawAlignment && verseCount !== undefined && verseCount !== rawAlignment.verses.length) {
            console.warn(
                `alignment has ${rawAlignment.verses.length} verses but Sefaria returned ${verseCount}; ignoring alignment`,
            );
        }
    }, [rawAlignment, verseCount]);

    const parsed = parsePassage(verses);
    const passage = alignment && parsed && parsed.to <= alignment.verses.length ? parsed : undefined;

    // Refs so the animation-frame loop always sees the latest state.
    const state = React.useRef({ alignment, passage, passagePlaying, loop });
    state.current = { alignment, passage, passagePlaying, loop };

    // Track the current verse, and stop (or loop) at the end of a passage. We poll on
    // animation frames rather than using `timeupdate`, which only fires every ~250ms.
    React.useEffect(() => {
        let frame = 0;
        const tick = () => {
            const audio = audioRef.current;
            const { alignment, passage, passagePlaying, loop } = state.current;
            if (audio && alignment) {
                const t = audio.currentTime;
                if (passage && passagePlaying) {
                    const { start, end } = passageTimes(alignment, passage);
                    if (t >= end) {
                        if (loop) {
                            audio.currentTime = start;
                        } else {
                            audio.pause();
                            // just inside the passage, so the last verse stays highlighted
                            audio.currentTime = end - 0.01;
                            setPassagePlaying(false);
                        }
                    }
                }
                setCurrentVerse(verseAt(alignment, audio.currentTime));
            }
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [audioRef, setCurrentVerse, setPassagePlaying]);

    // Pausing with the native controls ends passage playback.
    React.useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const onPause = () => setPassagePlaying(false);
        audio.addEventListener("pause", onPause);
        return () => audio.removeEventListener("pause", onPause);
    }, [audioRef, setPassagePlaying]);

    const seekToPassage = React.useCallback(() => {
        const audio = audioRef.current;
        if (audio && alignment && passage && audio.readyState >= 1) {
            audio.currentTime = passageTimes(alignment, passage).start;
        }
    }, [audioRef, alignment, passage]);

    // A link to a passage (#/genesis-1/5-12) cues the audio up at its start.
    const cued = React.useRef(false);
    React.useEffect(() => {
        if (!cued.current && alignment && passage) {
            cued.current = true;
            seekToPassage();
        }
    }, [alignment, passage, seekToPassage]);

    const setPassage = (p: Passage | undefined) => {
        const base = "/" + chapterToSlug(selectedChapter);
        navigate(p ? `${base}/${passageToString(p)}` : base, { replace: true });
    };

    const onVerseClick = (v: number, extend: boolean) => {
        const audio = audioRef.current;
        if (!audio || !alignment || alignment.verses[v - 1].absent) return;
        if (extend && passage) {
            setPassage({ from: Math.min(passage.from, v), to: Math.max(passage.to, v) });
            return;
        }
        setPassage({ from: v, to: v });
        setPassagePlaying(false);
        audio.currentTime = alignment.verses[v - 1].start;
        audio.play();
    };

    const playPassage = () => {
        const audio = audioRef.current;
        if (!audio || !alignment || !passage) return;
        const { start, end } = passageTimes(alignment, passage);
        if (audio.currentTime < start || audio.currentTime >= end - 0.05) {
            audio.currentTime = start;
        }
        audio.play().then(() => setPassagePlaying(true));
    };

    const passageBar =
        alignment && passage ? (
            <PassageBar
                alignment={alignment}
                passage={passage}
                audioUrl={url.url}
                playing={passagePlaying}
                loop={loop}
                setLoop={setLoop}
                play={playPassage}
                pause={() => audioRef.current?.pause()}
                clear={() => setPassage(undefined)}
            />
        ) : null;

    return (
        <>
            <Controls
                displayInterlinear={displayInterlinear}
                setDisplayInterlinear={setDisplayInterlinear}
                selectedChapter={selectedChapter}
                setSelectedChapter={setSelectedChapter}
                audioRef={audioRef}
                onLoadedMetadata={seekToPassage}
                passageBar={passageBar}
            />
            <Container id="main" className={passageBar ? "with-passage-bar" : undefined}>
                <Row className="mb-4 mt-4">
                    <Col xs={{ size: 12 }}>
                        <Sefaria
                            displayInterlinear={displayInterlinear}
                            verse={`${url.book} ${url.chapter}`}
                            currentVerse={currentVerse}
                            selection={passage}
                            onVerseCount={setVerseCount}
                            onVerseClick={alignment ? onVerseClick : undefined}
                        ></Sefaria>
                    </Col>
                </Row>
                <Footer />
            </Container>
        </>
    );
};

const App: React.FC = () => {
    return (
        <HashRouter>
            <Routes>
                <Route path="/:slug?/:verses?" element={<ScripturePage />} />
            </Routes>
        </HashRouter>
    );
};

export default App;
