import React from "react";
import axios from "axios";
import sanitize from "sanitize-html";
import { Row, Col } from "reactstrap";
import TextVersion from "./textVersion.json";

// The Hebrew text version is pinned so that it matches the version used to
// produce the audio alignments (see tools/align/README.md).
const hebrewVersionParam = encodeURIComponent(TextVersion.hebrew.replace(/ /g, "_"));

// this isn't complete, it's just a sketch of what we get back
// full docs at https://github.com/Sefaria/Sefaria-Project/wiki/API-Documentation#text-api
type SefariaResponse = {
    book: string;
    categories: Array<string>;
    commentary: Array<string>;
    he: Array<string>;
    heVersionSource: string;
    heVersionTitle: string;
    next: string;
    order: Array<number>;
    prev: string;
    ref: string;
    sectionNames: Array<string>;
    sections: Array<number>;
    text: Array<string>;
    titleVariants: Array<string>;
    toSections: Array<number>;
    type: string;
    versionSource: string;
    versionTitle: string;
    versions: Array<string> | undefined;
};

type VerseProps = {
    interlinear: boolean;
    number: number;
    hebrew: string;
    english: string;
    current: boolean;
    selected: boolean;
    onNumberClick?: (verse: number, extend: boolean) => void;
};

const Verse: React.FunctionComponent<VerseProps> = ({
    number,
    hebrew,
    english,
    interlinear,
    current,
    selected,
    onNumberClick,
}: VerseProps) => {
    const rowRef = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        if (current && rowRef.current) {
            rowRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }, [current]);

    const cleanup = (s: string, cn: string) => {
        const inner = {
            __html: sanitize(s, {
                allowedTags: ["b", "em", "strong", "small"],
                allowedAttributes: {},
                // throw away sefaria footnotes
                nonTextTags: ["sup", "i", "style", "script", "textarea", "option", "noscript"],
            }),
        };
        return <div className={cn} dangerouslySetInnerHTML={inner}></div>;
    };

    const englishElem = interlinear ? cleanup(english, "english interlinear text-left") : <></>;
    const hebrewElem = cleanup(hebrew, "biblical-hebrew text-end");
    return (
        <>
            <div
                ref={rowRef}
                className={["verse-row", current && "current", selected && "selected"].filter(Boolean).join(" ")}
            >
                <Row>
                    <Col xs={{ size: 10, offset: 1 }}>
                        {hebrewElem}
                        {englishElem}
                    </Col>
                    <Col xs={{ size: 1 }}>
                        {onNumberClick ? (
                            <button
                                type="button"
                                className="verse-number"
                                title="Play from this verse (shift-click to select a passage)"
                                onClick={(e) => onNumberClick(number, e.shiftKey)}
                            >
                                {number}
                            </button>
                        ) : (
                            number
                        )}
                    </Col>
                </Row>
            </div>
        </>
    );
};

type SefariaProps = {
    verse: string;
    displayInterlinear: boolean;
    currentVerse?: number;
    selection?: { from: number; to: number };
    onVerseCount?: (count: number | undefined) => void;
    onVerseClick?: (verse: number, extend: boolean) => void;
};

const Sefaria: React.FunctionComponent<SefariaProps> = ({
    verse,
    displayInterlinear,
    currentVerse,
    selection,
    onVerseCount,
    onVerseClick,
}: SefariaProps) => {
    const [sefariaResponse, setSefariaResponse] = React.useState<SefariaResponse>();
    const [sefariaError, setSefariaError]: [string | undefined, any] = React.useState();

    React.useEffect(() => {
        setSefariaResponse(undefined);
        onVerseCount?.(undefined);
        axios
            .get("https://www.sefaria.org/api/texts/" + encodeURIComponent(verse) + "?vhe=" + hebrewVersionParam, {
                headers: {
                    "Content-Type": "application/json",
                },
                timeout: 5000,
            })
            .then((response) => {
                setSefariaError();
                setSefariaResponse(response.data);
                onVerseCount?.(response.data.he.length);
            })
            .catch((ex) => {
                setSefariaError(`Unable to retrieve scripture from Sefaria.`);
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [verse]);

    if (sefariaError) {
        return <div>{sefariaError}</div>;
    }

    if (!sefariaResponse) {
        return <div>Retrieving scripture...</div>;
    }

    const verses = sefariaResponse.he.map((hebrew, idx) => (
        <Verse
            key={idx}
            interlinear={displayInterlinear}
            number={idx + 1}
            hebrew={hebrew}
            english={sefariaResponse.text[idx]}
            current={currentVerse === idx + 1}
            selected={selection !== undefined && idx + 1 >= selection.from && idx + 1 <= selection.to}
            onNumberClick={onVerseClick}
        />
    ));

    return (
        <>
            {verses}
            <p>
                Hebrew:{" "}
                <a target="_other" href={sefariaResponse.heVersionSource}>
                    {sefariaResponse.heVersionTitle}
                </a>
            </p>
            <p>
                English translation:{" "}
                <a target="_other" href={sefariaResponse.versionSource}>
                    {sefariaResponse.versionTitle}
                </a>
            </p>
        </>
    );
};

export { Sefaria };
