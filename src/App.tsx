import React from 'react';
import { Form, FormGroup, Label, Input, Container, Row, Col } from 'reactstrap';
import './App.css';
import axios from 'axios';

enum TranslationLanguage {
    None,
    English
};

type SefariaProps = {
    verse: string,
    translation: TranslationLanguage,
};

const Sefaria: React.FunctionComponent<SefariaProps> = ({ verse, translation }: SefariaProps) => {
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

    if (translation === TranslationLanguage.English) {
        return <div className="">{sefariaResponse.text}</div>;
    } else {
        return <div className="biblical-hebrew display-3">{sefariaResponse.he}</div>;
    }

};

function App() {
    return (
        <div>
            <div color="light" className="fixed-top">
                <div>
                    <Form>
                        <FormGroup check>
                            <Label check>
                                <Input type="checkbox" />
                                Interlinear
                            </Label>
                        </FormGroup>
                    </Form>
                    <audio controls src="https://raw.githubusercontent.com/grahame/Schmueloff---Torah/master/01%20Genesis/Genesis%2008.mp3" />
                </div>
            </div>
            <Container id="main">

                <Row className="mb-4 mt-4">
                    <Col xs={{ size: 10, offset: 1 }} className="text-right">
                        <Sefaria translation={TranslationLanguage.English} verse="Genesis 8"></Sefaria>
                    </Col>
                </Row>
                <hr></hr>
                <Row>
                    <p>
                        English and Hebrew tejjxt from the Bible/Tanakh is taken from <a target="_other" href="https://www.sefaria.org">Sefaria</a>.
                    Hebrew text is displayed using the <a target="_other" href="https://www.sbl-site.org/educational/BiblicalFonts_SBLHebrew.aspx">Society of Biblical Literature Hebrew font</a>.
                    Recordings were downloaded from <a href="https://archive.org/">archive.org</a> - they were entrusted to the Carmelites. <a target="_other" href="http://individual.utoronto.ca/mfkolarcik/AbrahamShmuelof.html">More about Abraham Shmuelof.</a>
                    </p>
                </Row>
            </Container>
        </div>
    );
}

export default App;
