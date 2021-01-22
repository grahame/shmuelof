import React from 'react';
import { Button, Container, Row, Col } from 'reactstrap';
import axios from 'axios';

enum SefariaLanguage {
    Hebrew,
    English
};

type SefariaProps = {
    verse: string,
    lang: SefariaLanguage,
};

const Sefaria: React.FunctionComponent<SefariaProps> = ({ verse, lang }: SefariaProps) => {
    const [sefariaResponse, setSefariaResponse]: [any, any] = React.useState({ 'text': '', 'he': '' });

    React.useEffect(() => {
        axios
            .get('https://www.sefaria.org/api/texts/' + encodeURIComponent(verse), {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 5000,
            })
            .then((response) => {
                setSefariaResponse(response.data);
            })
            .catch((ex) => {
            });
    }, [verse]);

    if (lang === SefariaLanguage.English) {
        return <div className="">{sefariaResponse.text}</div>;
    } else {
        return <div className="biblical-hebrew display-3">{sefariaResponse.he}</div>;
    }

};

function MyCol(props: any) {
    return <Col xs={{ size: 8, offset: 2 }} className="text-center">{props.children}</Col>;
}

function App() {
    return (
        <Container>
            <Row className="mb-4 mt-4">
                <MyCol><h1 className="text-center">The Hebrew Bible</h1><h2>as read by Abraham Schmueloff</h2></MyCol>
            </Row>
            <Row className="mb-4 mt-4">
                <MyCol>
                    <audio controls src="https://raw.githubusercontent.com/grahame/Schmueloff---Torah/master/01%20Genesis/Genesis%2008.mp3" />
                </MyCol>
            </Row>
            <Row className="mb-4 mt-4">
                <Col xs={{ size: 5, offset: 1 }} className="text-left">
                    <Sefaria lang={SefariaLanguage.English} verse="Genesis 8"></Sefaria>
                </Col>
                <Col xs={{ size: 5 }} className="text-right">
                    <Sefaria lang={SefariaLanguage.Hebrew} verse="Genesis 8"></Sefaria>
                </Col>
            </Row>
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
