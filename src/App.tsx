import React from 'react';
import { Sefaria } from './Sefaria';
import { useRef } from 'react';
import { ButtonToggle, ButtonGroup, DropdownMenu, DropdownItem, Container, Row, Col } from 'reactstrap';
import './App.css';
import URLs from './urls.json';

enum PlaybackRate {
    Slow,
    Normal,
    Fast
};

function Controls({displayInterlinear, setDisplayInterlinear}: {displayInterlinear: boolean, setDisplayInterlinear: any}) {
    const [playbackRate, setPlaybackRate] = React.useState<PlaybackRate>(PlaybackRate.Normal);
    const audioRef = useRef<HTMLAudioElement>(null);

    const applyPlayback = () => {
        if (!audioRef.current) {
            return;
        }
        var rate: number = 1.0;
        if (playbackRate === PlaybackRate.Slow) {
            rate = 0.75;
        } else if (playbackRate === PlaybackRate.Fast) {
            rate = 1.25;
        }
        audioRef.current.playbackRate = rate;
    };
    // apply the current playback rate to the ref if it exists
    applyPlayback();

    function RateToggle({ value, label }: { value: PlaybackRate; label: string; }) {
        return <>
                <ButtonToggle
                    className={playbackRate === value ? 'active' : undefined}
                    onClick={() => setPlaybackRate(value)}>{label}</ButtonToggle>
            </>;
    }

    return <>
        <div className="fixed-top bg-dark text-light">
            <Row>
                <Col xs={{ size: 1, offset: 1 }}>
                    <ButtonToggle>Interlinear</ButtonToggle>
                </Col>
                <Col xs={{ size: 2 }}>
                    <ButtonGroup>
                        <RateToggle value={PlaybackRate.Slow} label="Slow" />
                        <RateToggle value={PlaybackRate.Normal} label="Normal" />
                        <RateToggle value={PlaybackRate.Fast} label="Fast" />
                    </ButtonGroup>
                </Col>
                <Col xs={{ size: 2 }}>
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
    return <Row>
        <p>
            English and Hebrew text from the Bible/Tanakh is taken from <a target="_other" href="https://www.sefaria.org">Sefaria</a>.
            Hebrew text is displayed using the <a target="_other" href="https://www.sbl-site.org/educational/BiblicalFonts_SBLHebrew.aspx">Society of Biblical Literature Hebrew font</a>.
            Recordings were downloaded from <a href="https://archive.org/">archive.org</a> - they were entrusted to the Carmelites. <a target="_other" href="http://individual.utoronto.ca/mfkolarcik/AbrahamShmuelof.html">More about Abraham Shmuelof.</a>
        </p>
    </Row>;
}

function App() {
    const [displayInterlinear, setDisplayInterlinear] = React.useState<boolean>(false);
    const [bookAndChapter] = React.useState<string | undefined>();

    return (
        <div>
            <Controls displayInterlinear={displayInterlinear} setDisplayInterlinear={setDisplayInterlinear} />
            <Container id="main">
                <Row className="mb-4 mt-4">
                    <Col xs={{ size: 10, offset: 1 }} className="text-right">
                        <Sefaria displayInterlinear={displayInterlinear} verse="Genesis 8"></Sefaria>
                    </Col>
                </Row>
                <hr></hr>
                <Footer />
            </Container>
        </div>
    );
}

export default App;
