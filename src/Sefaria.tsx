import React from 'react';
import axios from 'axios';
export {Sefaria};

type SefariaProps = {
    verse: string,
    displayInterlinear: boolean,
};

const Sefaria: React.FunctionComponent<SefariaProps> = ({ verse, displayInterlinear }: SefariaProps) => {
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

    return <div className="biblical-hebrew display-3">{sefariaResponse.he}</div>;
};
