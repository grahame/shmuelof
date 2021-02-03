import React from 'react';
import { Sefaria } from './Sefaria';
import { useRef } from 'react';
import { ButtonToolbar, ButtonToggle, ButtonGroup, Dropdown, DropdownToggle, DropdownMenu, DropdownItem, Container, Row, Col } from 'reactstrap';
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
};

function BookSelector() {
    const [isOpen, setIsOpen] = React.useState<boolean>(false);
    
    return <Dropdown isOpen={isOpen} toggle={() => setIsOpen(!isOpen)}>
        <DropdownToggle caret>Book</DropdownToggle>
        <DropdownMenu>
            <DropdownItem>Cats!</DropdownItem>
        </DropdownMenu>
    </Dropdown>;
}

function ChapterSelector() {
    const [isOpen, setIsOpen] = React.useState<boolean>(false);
    
    return <Dropdown isOpen={isOpen} toggle={() => setIsOpen(!isOpen)}>
        <DropdownToggle caret>Chapter</DropdownToggle>
        <DropdownMenu>
            <DropdownItem>Cats!</DropdownItem>
        </DropdownMenu>
    </Dropdown>;
}

function PlaybackToName(rate: PlaybackRate) {
    return PlaybackRate[rate].replaceAll('_', ' ');

}

function Controls({ displayInterlinear, setDisplayInterlinear }: ControlsProps) {
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
        } else if (playbackRate == PlaybackRate.Fast) {
            rate = 1.25;
        } else if (playbackRate == PlaybackRate.Very_Fast) {
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
            <DropdownToggle caret>{PlaybackToName(playbackRate)}</DropdownToggle>
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
                onClick={() => setDisplayInterlinear(!displayInterlinear)}>Interlinear</ButtonToggle>
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
                            <BookSelector />
                            <ChapterSelector />
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
    const [bookAndChapter] = React.useState<string | undefined>();

    return (
        <div>
            <Controls displayInterlinear={displayInterlinear} setDisplayInterlinear={setDisplayInterlinear} />
            <Container id="main">
                <Row className="mb-4 mt-4">
                    <Col xs={{ size: 10, offset: 1 }}>
                        <Sefaria displayInterlinear={displayInterlinear} verse="Genesis 8"></Sefaria>
                    </Col>
                </Row>
                <Footer />
            </Container>
        </div>
    );
}

export default App;
