import React, { useMemo } from "react";
import { Group } from "../export-types";
import { NumberField } from "./NumberField";
import { TextField } from "./TextField";
import { Updater } from "../../../../json-diff/Updater";

export const GroupEditor = ({
  value,
  update,
}: {
  value: Group;
  update: Updater<Group>;
}) => {
  const entries = useMemo(
    () => Object.entries(value.entities),
    [value.entities]
  );

  return (
    <div className="space-y-3">
      <TextField label="Name" value={value.name ?? ""} onChange={update.name} />
      <div className="space-y-2">
        {/* <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm">Child order</div>
                    <button
                        className="btn btn-outline btn-xs"
                        onClick={() =>
                            onChange({
                                ...value,
                                entities: {
                                    ...value.entities,
                                    [`child-${entries.length + 1}`]: entries.length,
                                },
                            })
                        }
                    >
                        Add child ref
                    </button>
                </div> */}
        {entries.length === 0 ? (
          <div className="text-sm opacity-60">No members linked.</div>
        ) : null}
        <div className="space-y-2">
          {/* {entries.map(([key, order]) => (
                        <div key={key} className="flex flex-col md:flex-row gap-2">
                            <TextField
                                label="Id"
                                value={key}
                                onChange={(nextKey) => {
                                    const entities = {...value.entities};
                                    delete entities[key];
                                    entities[nextKey] = order;
                                    onChange({...value, entities});
                                }}
                            />
                            <NumberField
                                label="Order"
                                value={order}
                                onChange={(next) =>
                                    onChange({...value, entities: {...value.entities, [key]: next}})
                                }
                            />
                            <div className="flex-1" />
                            <button
                                className="btn btn-ghost btn-xs text-error"
                                onClick={() => {
                                    const entities = {...value.entities};
                                    delete entities[key];
                                    onChange({...value, entities});
                                }}
                            >
                                Remove
                            </button>
                        </div>
                    ))} */}
        </div>
      </div>

      {/* <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm">Crops</div>
                    <button
                        className="btn btn-outline btn-xs"
                        onClick={() =>
                            onChange({
                                ...value,
                                crops: value.crops.concat([{id: `crop-${value.crops.length + 1}`}]),
                            })
                        }
                    >
                        Add crop ref
                    </button>
                </div>
                {value.crops.length === 0 ? (
                    <div className="text-sm opacity-60">No crops applied.</div>
                ) : null}
                <div className="space-y-2">
                    {value.crops.map((crop, i) => (
                        <div key={i} className="flex flex-col md:flex-row gap-2 md:items-center">
                            <TextField
                                label="Crop id"
                                value={crop.id}
                                onChange={(id) => {
                                    const crops = [...value.crops];
                                    crops[i] = {...crop, id};
                                    onChange({...value, crops});
                                }}
                            />
                            <label className="label cursor-pointer gap-2">
                                <span className="label-text text-sm">Hole</span>
                                <input
                                    type="checkbox"
                                    className="checkbox"
                                    checked={crop.hole ?? false}
                                    onChange={(evt) => {
                                        const crops = [...value.crops];
                                        crops[i] = {...crop, hole: evt.target.checked || undefined};
                                        onChange({...value, crops});
                                    }}
                                />
                            </label>
                            <label className="label cursor-pointer gap-2">
                                <span className="label-text text-sm">Rough</span>
                                <input
                                    type="checkbox"
                                    className="checkbox"
                                    checked={crop.rough ?? false}
                                    onChange={(evt) => {
                                        const crops = [...value.crops];
                                        crops[i] = {
                                            ...crop,
                                            rough: evt.target.checked || undefined,
                                        };
                                        onChange({...value, crops});
                                    }}
                                />
                            </label>
                            <div className="flex-1" />
                            <button
                                className="btn btn-ghost btn-xs text-error"
                                onClick={() =>
                                    onChange({
                                        ...value,
                                        crops: value.crops.filter((_, idx) => idx !== i),
                                    })
                                }
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                </div>
            </div> */}
    </div>
  );
};
