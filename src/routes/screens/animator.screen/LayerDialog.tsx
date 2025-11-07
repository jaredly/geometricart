import React from 'react';

export const LayerDialog = ({
    addLayer,
    patterns,
}: {
    addLayer: (hash: string) => void;
    patterns: string[];
}) => {
    return (
        <div className="modal-box flex flex-col w-11/12 max-w-5xl h-full max-h-full overflow-auto">
            <form method="dialog" className="contents">
                <div className="mb-4">
                    <input className="input mr-4" type="text" name="id" />
                    <button
                        className="btn"
                        onClick={(evt) => {
                            const data = new FormData(evt.currentTarget.form!);
                            const id = data.get('id') as string;
                            if (id && patterns.includes(id)) {
                                addLayer(id);
                            }
                        }}
                    >
                        Add by id
                    </button>
                </div>
                <div className="flex flex-wrap gap-4">
                    {patterns.map((hash) => (
                        <button
                            onClick={() => {
                                addLayer(hash);
                            }}
                        >
                            <img
                                src={`/gallery/pattern/${hash}/320.png`}
                                className="w-40 h-40"
                                key={hash}
                            />
                        </button>
                    ))}
                </div>
            </form>
        </div>
    );
};
