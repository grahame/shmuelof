import React from 'react';
import { Sefaria } from './Sefaria';
import { useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
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
    for (const [idx, url] of URLs.urls.entries()) {
        books.push(MakeLabel(idx));
    }
    return books;
}

function ChapterSelector({ value, set } : {value: number, set: any} ) {
    const [isOpen, setIsOpen] = React.useState<boolean>(false);
    const [selected, setSelected ] = React.useState<Array<BookLabel>>([MakeLabel(value)]);

    const maybePushUp = function(labels: Array<BookLabel>) {
        setSelected(labels);
        if (labels.length === 0) {
            return;
        }
        set(labels[0].id);
    }

    return <Typeahead options={BooksAndChapters()} placeholder="Choose Tanakh chapter..." selected={selected} onChange={maybePushUp} />
}

function PlaybackToName(rate: PlaybackRate) {
    return PlaybackRate[rate].replaceAll('_', ' ');

}

function Controls({ displayInterlinear, setDisplayInterlinear, selectedChapter, setSelectedChapter }: ControlsProps) {
    const [playbackRate, setPlaybackRate] = React.useState<PlaybackRate>(PlaybackRate.Normal);
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
                            <Button><FontAwesomeIcon icon={faAngleDoubleLeft} /></Button>
                            <ChapterSelector value={selectedChapter} set={setSelectedChapter} />
                            <Button><FontAwesomeIcon icon={faAngleDoubleRight} /></Button>
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
                        src="https://raw.githubusercontent.com/grahame/Schmueloff---Torah/master/01%20Genesis/Genesis%2008.mp3" />
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

function App() {
    const [displayInterlinear, setDisplayInterlinear] = React.useState<boolean>(false);
    const [selectedChapter, setSelectedChapter] = React.useState<number>(0);
    const [bookAndChapter] = React.useState<string | undefined>();

    var url = URLs.urls[selectedChapter];

    const getCurrentChapter = () => `${url.book} ${url.chapter}`;
    return (
        <div>
            <Controls displayInterlinear={displayInterlinear} setDisplayInterlinear={setDisplayInterlinear} selectedChapter={selectedChapter} setSelectedChapter={setSelectedChapter} />
            <Container id="main">
                <Row className="mb-4 mt-4">
                    <Col xs={{ size: 10, offset: 1 }}>
                        <Sefaria displayInterlinear={displayInterlinear} verse={getCurrentChapter()}></Sefaria>
                    </Col>
                </Row>
                <Footer />
            </Container>
        </div>
    );
}

export default App;
