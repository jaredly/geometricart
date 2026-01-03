import React from "react";
import { BlurInt } from "../../../../editor/Forms";
import { BaseKind } from "../export-types";
import { BlurInput } from "./BlurInput";
import { Updater } from "../../../../json-diff/Updater";

export const DistanceEditor = ({
  value,
  update,
}: {
  value: BaseKind & { type: "distance" };
  update: Updater<BaseKind & { type: "distance" }>;
}) => {
  return (
    <div>
      <label>
        Corner
        <BlurInt
          className="input input-sm w-10 mx-2"
          value={value.corner}
          onChange={(corner) =>
            corner != null ? update.corner.replace(corner) : undefined
          }
        />
        Dist
        <BlurInput
          className="w-15 mx-2"
          value={value.distances.map((m) => m.toString()).join(",")}
          onChange={(dist) => {
            if (!dist) return;
            const t = dist.split(",").map((n) => Number(n));
            if (!t.length || !t.every((n) => Number.isFinite(n))) return;
            update.distances.replace(t);
          }}
        />
      </label>
    </div>
  );
};
