import React, { useState, useEffect } from "react";
import { Color, Entity } from "../export-types";
import { JsonEditor } from "./JsonEditor";
import { PatternEditor } from "./PatternEditor";
import { GroupEditor } from "./GroupEditor";
import { ExternalLinkIcon } from "../../../../icons/Icon";
import { Updater } from "../../../../json-diff/Updater";
import { SubStyleList } from "./SubStyleList";
import { FillEditor, ModsEditor } from "./FillEditor";
import { createFill, createLine } from "./createLayerTemplate";
import { LineEditor } from "./LineEditor";

export const EntityEditor = ({
  palette,
  value,
  update,
}: {
  palette: Color[];
  value: Entity;
  update: Updater<Entity>;
}) => {
  const [type, setType] = useState<Entity["type"]>(value.type);

  useEffect(() => {
    setType(value.type);
  }, [value.type]);

  return (
    <details className="rounded border border-base-300 bg-base-100 p-3 space-y-3">
      <summary className="cursor-pointer hover:text-accent">
        <div className="inline-flex items-center">
          {value.type}
          {value.type === 'Object' ? <span className="px-4">{value.shape}</span> : null}
          <div className="flex-1" />
          {value.type === "Pattern" && (
            <a
              className="link text-sm mx-4"
              target="_blank"
              href={`/gallery/pattern/${typeof value.tiling === 'string' ? value.tiling : value.tiling.id}`}
            >
              <ExternalLinkIcon />
            </a>
          )}

          <button
            className="btn btn-ghost btn-xs text-error"
            onClick={update.remove}
          >
            Remove
          </button>
        </div>
      </summary>

      {value.type === "Group" ? (
        <GroupEditor value={value} update={update.variant("Group")} />
      ) : null}
      {value.type === "Pattern" ? (
        <PatternEditor
          palette={palette}
          value={value}
          update={update.variant("Pattern")}
        />
      ) : null}
      {value.type === "Object" ? (
        <div className="space-y-2">
          <label className="form-control">
            <div className="label">
              <span className="label-text font-semibold">Open</span>
            </div>
            {/* <input
                        className="toggle toggle-primary"
                        type="checkbox"
                        checked={value.open ?? false}
                        onChange={(evt) => onChange({...value, open: evt.target.checked})}
                    /> */}
          </label>
          {/* <JsonEditor
                        label="Segments"
                        value={value.segments}
                        onChange={(segments) =>
                            onChange({...value, segments: segments as Segment[]})
                        }
                    /> */}
          <SubStyleList
            label="Fills"
            emptyLabel="No fills"
            items={value.style.fills}
            createItem={createFill}
            render={(key, fill, update, reId) => (
              <FillEditor
                key={key}
                value={fill}
                update={update}
                reId={reId}
                palette={palette}
              />
            )}
            update={update.variant("Object").style.fills}
          />
          <SubStyleList
            label="Lines"
            emptyLabel="No lines"
            items={value.style.lines}
            createItem={createLine}
            render={(key, line, update, reId) => (
              <LineEditor
                key={key}
                reId={reId}
                palette={palette}
                value={line}
                update={update}
              />
            )}
            update={update.variant("Object").style.lines}
          />
          <ModsEditor
            palette={palette}
            mods={value.style.mods}
            update={update.variant("Object").style.mods}
          />
        </div>
      ) : null}
    </details>
  );
};
