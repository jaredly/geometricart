import * as React from 'react';
import { ShowMirror } from './editor/MirrorForm';
import { Mirror } from './types';
import { getTransformsForNewMirror } from './rendering/getMirrorTransforms';
import { SelectButton } from 'primereact/selectbutton';
import { range } from './run';

export function MirrorPicker({
    onClick,
}: {
    onClick: (mirror: Mirror | null) => void;
}) {
    const [reflect, setReflect] = React.useState(true);
    return (
        <div className="flex flex-column align-items-center p-5">
            <SelectButton
                options={[
                    { label: 'Reflect', value: true },
                    {
                        label: 'No reflection',
                        value: false,
                    },
                ]}
                color="primary"
                value={reflect}
                onChange={(e) => setReflect(e.value)}
            />
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'center',
                }}
                className="pt-5"
            >
                {[
                    [2, 4, 8],
                    [3, 6, 12],
                    [5, 10, 0],
                    [7, 9],
                ].map((row, i) => (
                    <div
                        key={i}
                        style={{
                            display: 'flex',
                            justifyContent: 'flex-start',
                            flexDirection: 'column',
                        }}
                        className="mr-5"
                    >
                        {row.map((n) => {
                            const mirror: Mirror | null =
                                n > 0
                                    ? {
                                          origin: { x: 0, y: 0 },
                                          point: { x: 0, y: -1 },
                                          reflect: reflect,
                                          rotational: range(0, n - 1).map(
                                              () => true,
                                          ),
                                          parent: null,
                                          id: '',
                                      }
                                    : null;
                            return (
                                <div
                                    className="mb-5 surface-ground p-2 border-round-md hover:surface-hover transition-colors transition-duration-150"
                                    key={n}
                                    style={{
                                        position: 'relative',
                                        cursor: 'pointer',
                                    }}
                                    onClick={() => onClick(mirror)}
                                >
                                    {mirror ? (
                                        <ShowMirror
                                            mirror={mirror}
                                            size={100}
                                            transforms={getTransformsForNewMirror(
                                                mirror,
                                            )}
                                        />
                                    ) : (
                                        <div
                                            style={{ width: 100, height: 100 }}
                                        />
                                    )}
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: '100%',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }}
                                    >
                                        {n > 0 ? n : 'Blank'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
