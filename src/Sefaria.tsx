import React from 'react';
import axios from 'axios';
import { Row, Col } from 'reactstrap';

// this isn't complete, it's just a sketch of what we get back
// full docs at https://github.com/Sefaria/Sefaria-Project/wiki/API-Documentation#text-api
type SefariaResponse = {
    book: string,
    categories: [string],
    commentary: [string],
    he: [string],
    next: string,
    order: [number],
    prev: string,
    ref: string,
    sectionNames: [string],
    sections: [number],
    text: [string],
    titleVariants: [string],
    toSections: [number],
    type: string,
    versionSource: string,
    versionTitle: string,
    versions: [string] | undefined,
};

type VerseProps = {
    interlinear: boolean,
    number: number,
    hebrew: string,
    english: string,
};


const Verse: React.FunctionComponent<VerseProps> = ({ number, hebrew, english, interlinear }: VerseProps) => {
    var englishElem;
    if (interlinear) {
        englishElem = <div className="english interlinear text-left">{ english }</div>
    }
    return <>
        <Row className="verse-row">
            <Col xs={{ size: 10, offset: 1 }}>
                <div className="biblical-hebrew text-right">{ hebrew }</div>
                { englishElem }
            </Col>
            <Col xs={{ size: 1}}>
                { number }
            </Col>
        </Row>
    </>;
}

type SefariaProps = {
    verse: string,
    displayInterlinear: boolean,
};

const Sefaria: React.FunctionComponent<SefariaProps> = ({ verse, displayInterlinear }: SefariaProps) => {
    const [sefariaResponse, setSefariaResponse] = React.useState<SefariaResponse>();
    const [sefariaError, setSefariaError]: [string|undefined, any] = React.useState();

    React.useEffect(() => {
        axios
            .get('https://www.sefaria.org/api/texts/' + encodeURIComponent(verse), {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 5000,
            })
            .then((response) => {
                setSefariaError();
                setSefariaResponse(response.data);
            })
            .catch((ex) => {
                setSefariaError(`Unable to retrieve scripture from Sefaria ${ex.response.status}`);
            });
    }, [verse]);

    if (sefariaError) {
        return <div>{sefariaError}</div>;
    }

    if (!sefariaResponse) {
        return <div>Retrieving scripture...</div>;
    }

    const verses = sefariaResponse.he.map((hebrew, idx) => 
        <Verse interlinear={displayInterlinear} number={idx+1} hebrew={hebrew} english={sefariaResponse.text[idx]} />
    );

    return <>
        { verses }
        <p>
            English translation: <a target="_other" href={ sefariaResponse.versionSource }>{ sefariaResponse.versionTitle }</a>
        </p>
    </>;
};

export {Sefaria};
