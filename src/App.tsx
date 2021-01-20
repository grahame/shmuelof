import React from 'react';
import { Button, Container, Row, Col } from 'reactstrap';

function MyCol(props: any) {
    return <Col xs={{ size: 8, offset: 2 }} className="text-center">{props.children}</Col>;
}

function Link(props: any) {
    return <Row className="mb-2">
        <MyCol>
            <Button href={props.url} className="w-100 rounded-pill" size="lg" color="secondary">{props.children}</Button>
        </MyCol>
    </Row>
}

function App() {
    return (
        <Container className="text-light">
            <Row className="mb-4 mt-4">
                <MyCol><h1 className="text-center">The Hebrew Bible</h1><h2>as read by Abraham Schmueloff</h2></MyCol>
            </Row>
            <audio controls src="https://raw.githubusercontent.com/grahame/Schmueloff---Torah/master/01%20Genesis/Genesis%2008.mp3"/>
            <Row>
                <p>
                    English and Hebrew text from the Bible/Tanakh is taken from <a target="_other" href="https://www.sefaria.org">Sefaria</a>.
                    Hebrew text is displayed using the <a target="_other" href="https://www.sbl-site.org/educational/BiblicalFonts_SBLHebrew.aspx">Society of Biblical Literature Hebrew font</a>.
                    Recordings were downloaded from <a href="https://archive.org/">archive.org</a> - they were entrusted to the Carmelites. <a target="_other" href="http://individual.utoronto.ca/mfkolarcik/AbrahamShmuelof.html">More about Abraham Shmuelof.</a>
                </p>
            </Row>
        </Container>
    );
}

export default App;
