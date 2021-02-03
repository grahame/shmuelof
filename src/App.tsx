import React from 'react';
import { Sefaria } from './Sefaria';
import { useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { HashRouter, Route, useHistory } from 'react-router-dom';
import { faAngleDoubleLeft, faAngleDoubleRight, faTachometerAlt, faGripLines } from '@fortawesome/free-solid-svg-icons'
import { Button, ButtonToolbar, ButtonToggle, ButtonGroup, Dropdown, DropdownToggle, DropdownMenu, DropdownItem, Container, Row, Col } from 'reactstrap';
import { Typeahead } from 'react-bootstrap-typeahead';
import 'react-bootstrap-typeahead/css/Typeahead.css';
import './App.css';
import URLs from './urls.json';

enum PlaybackRate {
    Very_Slow,
    Slow,
    Normal,
    Fast,
    Very_Fast,
};

type ControlsProps = {
    displayInterlinear: boolean;
    setDisplayInterlinear: any;
    selectedChapter: number;
    setSelectedChapter: any;
};

type BookLabel = {
    id: number,
    label: string
}

function MakeLabel(idx: number) : BookLabel {
    var url = URLs.urls[idx];
    return {
        id: idx,
        label: `${url.book} ${url.chapter}`
    }
}

function BooksAndChapters() {
    var books = new Array<BookLabel>();
    for (const [idx] of URLs.urls.entries()) {
        books.push(MakeLabel(idx));
    }
    return books;
}

function slugToChapter(slug: string) {
    if (slug === undefined) {
        return undefined;
    }
    const [book, chapterString] = slug.split('-');
    const chapter = parseInt(chapterString);
    if (isNaN(chapter)) {
        return undefined;
    }
    for (const [idx, url] of URLs.urls.entries()) {
        if ((url.book.toLowerCase() === book) && (url.chapter === chapter)) {
            return idx;
        }
    }
    return undefined;
}

function chapterToSlug(idx: number) {
    var url = URLs.urls[idx];
    return url.book.toLowerCase() + '-' + url.chapter;
}

function ChapterSelector({ value, set } : {value: number, set: any} ) {
    const [selected, setSelected ] = React.useState<Array<BookLabel>>([MakeLabel(value)]);
    const history = useHistory();

    // this is ugly: while someone is typing, selected from the Typeahead
    // control goes to `undefined`. we need to allow this for the internal
    // operation of the control. however, if `value` changes for some
    // external reason then we need to update the selection.
    React.useEffect(() => {
        if (selected && selected.length > 0 && selected[0].id !== value) {
            setSelected([MakeLabel(value)]);
        }
    }, [value, selected]);

    const maybeNav = function(labels: Array<BookLabel>) {
        setSelected(labels);
        if (labels.length === 0) {
            return;
        }
        history.push('/' + chapterToSlug(labels[0].id));
    }

    return <Typeahead id="books-and-chapters" inputProps={{className: "bg-dark text-light"}} options={BooksAndChapters()} placeholder="Choose Tanakh chapter..." selected={selected} onChange={maybeNav} />
}

function PlaybackToName(rate: PlaybackRate) {
    return PlaybackRate[rate].replaceAll('_', ' ');

}

function Controls({ displayInterlinear, setDisplayInterlinear, selectedChapter, setSelectedChapter }: ControlsProps) {
    const [playbackRate, setPlaybackRate] = React.useState<PlaybackRate>(PlaybackRate.Normal);
    const history = useHistory();
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
            rate = 1.5
        }
        audioRef.current.playbackRate = rate;
    };
    // apply the current playback rate to the ref if it exists
    applyPlayback();

    function RateToggle({ value }: { value: PlaybackRate; }) {
        const name = PlaybackToName(value);
        return <>
            <DropdownItem
                className={playbackRate === value ? 'active' : undefined}
                onClick={() => setPlaybackRate(value)}>{name}</DropdownItem>
        </>;
    }

    function RateControl() {
        const [isOpen, setIsOpen] = React.useState<boolean>(false);
        
        return <Dropdown isOpen={isOpen} toggle={() => setIsOpen(!isOpen)}>
            <DropdownToggle caret><FontAwesomeIcon icon={faTachometerAlt} /> {PlaybackToName(playbackRate)}</DropdownToggle>
            <DropdownMenu>
                <RateToggle value={PlaybackRate.Very_Slow} />
                <RateToggle value={PlaybackRate.Slow} />
                <RateToggle value={PlaybackRate.Normal} />
                <RateToggle value={PlaybackRate.Fast} />
                <RateToggle value={PlaybackRate.Very_Fast} />
            </DropdownMenu>
        </Dropdown>;
    }

    function InterlinearToggle() {
        return <>
            <ButtonToggle
                className={displayInterlinear ? 'active' : undefined}
                onClick={() => setDisplayInterlinear(!displayInterlinear)}><FontAwesomeIcon icon={faGripLines} /> Interlinear</ButtonToggle>
        </>;
    }

    function SetOffset(offset: number): undefined {
        history.push('/' + chapterToSlug(selectedChapter + offset));
        return undefined;
    }

    return <>
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
                            <Button disabled={selectedChapter === 0}><FontAwesomeIcon icon={faAngleDoubleLeft} onClick={() => SetOffset(-1)} /></Button>
                            <ChapterSelector value={selectedChapter} set={setSelectedChapter} />
                            <Button disabled={selectedChapter >= URLs.urls.length}><FontAwesomeIcon icon={faAngleDoubleRight} onClick={() => SetOffset(1)} /></Button>
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
                        src={URLs.urls[selectedChapter].url} />
                </Col>
            </Row>
        </div>
    </>;
}

function Footer() {
    return <>
        <hr />
        <Row>
            <p>
                English and Hebrew text from the Bible/Tanakh is taken from <a target="_other" href="https://www.sefaria.org">Sefaria</a>.
            Hebrew text is displayed using the <a target="_other" href="https://www.sbl-site.org/educational/BiblicalFonts_SBLHebrew.aspx">Society of Biblical Literature Hebrew font</a>.
            Recordings were downloaded from <a href="https://archive.org/">archive.org</a> - they were entrusted to the Carmelites. <a target="_other" href="http://individual.utoronto.ca/mfkolarcik/AbrahamShmuelof.html">More about Abraham Shmuelof.</a>
            </p>
        </Row>
    </>;
}

function ScripturePage({match}: {match: any}) {
    const [displayInterlinear, setDisplayInterlinear] = React.useState<boolean>(false);
    const history = useHistory();
    const selectedChapter = slugToChapter(match.params.slug);
    const setSelectedChapter = (idx: number) => history.push('/' + chapterToSlug(idx));
    if (selectedChapter === undefined) {
        setSelectedChapter(0);
        return <><p>One moment...</p> </>;
    }
    const url = URLs.urls[selectedChapter];
    const getCurrentChapter = () => `${url.book} ${url.chapter}`;


    return <>
        <Controls displayInterlinear={displayInterlinear} setDisplayInterlinear={setDisplayInterlinear} selectedChapter={selectedChapter} setSelectedChapter={setSelectedChapter} />
        <Container id="main">
            <Row className="mb-4 mt-4">
                <Col xs={{ size: 10, offset: 1 }}>
                    <Sefaria displayInterlinear={displayInterlinear} verse={getCurrentChapter()}></Sefaria>
                </Col>
            </Row>
            <Footer />
        </Container>
    </>;
}

function App() {
    return (
        <HashRouter>
            <Route path="/:slug?" render={(props) => <ScripturePage match={props.match} />} />
        </HashRouter>
    );
}

export default App;
