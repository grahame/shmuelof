import React from "react";
import { Sefaria } from "./Sefaria";
import { useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { HashRouter, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { faAngleDoubleLeft, faAngleDoubleRight, faTachometerAlt, faGripLines } from "@fortawesome/free-solid-svg-icons";
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
}) => {
    const [playbackRate, setPlaybackRate] = React.useState<PlaybackRate>(PlaybackRate.Normal);
    const navigate = useNavigate();
    const audioRef = useRef<HTMLAudioElement>(null);

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
                            src={URLs.urls[selectedChapter].url}
                        />
                    </Col>
                </Row>
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

const ScripturePage: React.FC = () => {
    const [displayInterlinear, setDisplayInterlinear] = React.useState<boolean>(false);
    const { slug } = useParams();
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
    const url = URLs.urls[selectedChapter];
    const getCurrentChapter = () => `${url.book} ${url.chapter}`;

    return (
        <>
            <Controls
                displayInterlinear={displayInterlinear}
                setDisplayInterlinear={setDisplayInterlinear}
                selectedChapter={selectedChapter}
                setSelectedChapter={setSelectedChapter}
            />
            <Container id="main">
                <Row className="mb-4 mt-4">
                    <Col xs={{ size: 12 }}>
                        <Sefaria displayInterlinear={displayInterlinear} verse={getCurrentChapter()}></Sefaria>
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
                <Route path="/:slug?" element={<ScripturePage />} />
            </Routes>
        </HashRouter>
    );
};

export default App;
