// import {render} from 'react-dom/client';

const Home = ({fixtures}: {fixtures: Array<string>}) => {
    return (
        <div style={{margin: 48}}>
            {!fixtures.length ? 'No vest tests found! Go create some.' : null}
            {fixtures.map((f) => (
                <a
                    style={{
                        display: 'block',
                        padding: 8,
                        margin: 8,
                        cursor: 'pointer',
                        color: 'white',
                    }}
                    key={f}
                    href={`/${f}`}
                >
                    {f}
                </a>
            ))}
        </div>
    );
};

// fetch('/vests')
//     .then((r) => r.json())
//     .then((fixtures) => {
//         render(<Home fixtures={fixtures} />, document.getElementById('root'));
//     });
