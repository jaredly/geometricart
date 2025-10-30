import {itemsForPath} from './RenderPath';
import {idSeed} from './idSeed';
import {paletteColor} from './RenderPath.lightenedColor.related';
import Prando from 'prando';
import * as React from 'react';
import {dist} from '../rendering/getMirrorTransforms';
import {Primitive} from '../rendering/intersect';
import {Path, PathGroup, Segment, State} from '../types';
import {StyleHover} from './StyleHover';
import {useTouchClick} from './RenderIntersections';
import {MenuItem} from './Canvas.MenuItem.related';
import {Action} from '../state/Action';
import {calcPathD} from './calcPathD';
import {RoughGenerator} from './RenderPath.RoughGenerator.related';

export const RenderPathMemo = ({
    path,
    origPath,
    zoom,
    sketchiness,
    groups,
    onClick,
    palette,
    generator,
    rand,
    clip,
    styleHover,
    contextMenu,
}: {
    contextMenu?: {
        state: State;
        dispatch: (action: Action) => void;
        showMenu: (evt: React.MouseEvent, items: MenuItem[]) => void;
    };
    path: Path;
    rand?: Prando;
    origPath?: Path;
    generator?: RoughGenerator;
    styleHover: StyleHover | null;
    clip?: {prims: Array<Primitive>; segments: Array<Segment>} | null;
    zoom: number;
    sketchiness: number | undefined;
    groups: {[key: string]: PathGroup};
    onClick?: (shiftKey: boolean, id: string) => void;
    palette: Array<string>;
}) => {
    const d = calcPathD(path, zoom);
    if (path.debug) {
        // console.log('DEBUG', path, d);
    }
    const style = path.style;
    const handlers = useTouchClick<null>(() => (onClick ? onClick(false, path.id) : null));

    // const insetPaths =
    //
    const fills = style.fills.map((fill, i) => {
        if (!fill) {
            return null;
        }
        const color = paletteColor(palette, fill.color, fill.lighten);
        if (color === 'transparent') {
            return null;
        }

        const common = {
            key: `fill-${i}`,
            fillOpacity: fill.opacity,
            stroke: 'none',
            style: onClick
                ? {
                      cursor: 'pointer',
                  }
                : {},
            onMouseDown: onClick ? (evt: React.MouseEvent) => evt.preventDefault() : undefined,
            fill: color,
            onClick: onClick
                ? (evt: React.MouseEvent) => {
                      evt.stopPropagation();
                      evt.preventDefault();
                      onClick(evt.shiftKey, path.id);
                  }
                : undefined,
            ...handlers(null),
        };
        if (path.segments.length === 1 && path.segments[0].type === 'Arc') {
            let r = dist(path.segments[0].center, path.segments[0].to);
            if (fill.inset) {
                r -= fill.inset / 100;
            }
            // it's full circle
            return (
                <circle
                    cx={path.segments[0].center.x * zoom}
                    cy={path.segments[0].center.y * zoom}
                    r={r * zoom}
                    {...common}
                />
            );
        }

        let raw = d;
        // let newPath = path;

        let pathInfos = [{path, raw}];

        return pathInfos.map(({path: newPath, raw}, k) => {
            if (generator && sketchiness && sketchiness > 0) {
                const p = generator.path(raw, {
                    fill: common.fill,
                    fillStyle: 'solid',
                    seed: idSeed(path.id),
                    roughness: sketchiness,
                    stroke: 'none',
                });
                const info = generator.toPaths(p);
                return info.map((info, i) => (
                    <path
                        key={`${k}:${i}`}
                        d={info.d}
                        stroke={info.stroke}
                        fill={info.fill != 'none' ? info.fill : common.fill}
                        strokeWidth={info.strokeWidth}
                        onContextMenu={
                            contextMenu
                                ? (evt) => {
                                      evt.preventDefault();
                                      const {state, dispatch, showMenu} = contextMenu;
                                      showMenu(
                                          evt,
                                          itemsForPath(origPath ?? path, state, dispatch),
                                      );
                                  }
                                : undefined
                        }
                        style={common.style}
                    />
                ));
            }

            return (
                <React.Fragment key={`info-${i}-${k}`}>
                    <path
                        d={raw}
                        data-id={path.id}
                        onContextMenu={
                            contextMenu
                                ? (evt) => {
                                      evt.preventDefault();
                                      const {state, dispatch, showMenu} = contextMenu;
                                      showMenu(
                                          evt,
                                          itemsForPath(origPath ?? path, state, dispatch),
                                      );
                                  }
                                : undefined
                        }
                        {...common}
                        key={`info-${i}-${k}`}
                    />
                </React.Fragment>
            );
        });
    });
    const lines = style.lines.map((line, i) => {
        if (!line) {
            return null;
        }
        const color = paletteColor(palette, line.color, line.lighten);
        if (color === 'transparent') {
            return null;
        }

        const common = {
            key: `line-${i}`,
            stroke: color,
            opacity: line.opacity,
            strokeDasharray: line.dash
                ? line.dash.map((d) => ((d / 100) * zoom).toFixed(2)).join(' ')
                : undefined,
            fill: 'none',
            // roundedCorners ?
            // strokeLinejoin: 'round' as 'round',
            onClick: onClick
                ? (evt: React.MouseEvent) => {
                      evt.stopPropagation();
                      evt.preventDefault();
                      onClick(evt.shiftKey, path.id);
                  }
                : undefined,
            onContextMenu: contextMenu
                ? (evt: React.MouseEvent) => {
                      evt.preventDefault();
                      const {state, dispatch, showMenu} = contextMenu;
                      showMenu(evt, itemsForPath(origPath ?? path, state, dispatch));
                  }
                : undefined,
            style: onClick
                ? {
                      cursor: 'pointer',
                  }
                : {},
            ...handlers(null),
            strokeWidth: line.width ? (line.width / 100) * zoom : 2,
            onMouseDown: onClick ? (evt: React.MouseEvent) => evt.preventDefault() : undefined,
        };
        if (path.segments.length === 1 && path.segments[0].type === 'Arc' && !path.open) {
            let r = dist(path.segments[0].center, path.segments[0].to);
            if (line.inset) {
                r -= line.inset / 100;
            }
            // it's full circle
            return (
                <circle
                    cx={path.segments[0].center.x * zoom}
                    cy={path.segments[0].center.y * zoom}
                    r={r * zoom}
                    {...common}
                />
            );
        }

        let pathInfos = [{path, raw: d}];

        return pathInfos.map(({raw}, k) => {
            if (generator && sketchiness && sketchiness > 0) {
                const p = generator.path(raw, {
                    fill: 'none',
                    seed: idSeed(path.id),
                    roughness: sketchiness,
                    stroke: common.stroke,
                    strokeWidth: common.strokeWidth,
                });
                const info = generator.toPaths(p);
                return info.map((info, i) => (
                    <path
                        key={`line-info-${i}:${k}`}
                        d={info.d}
                        stroke={info.stroke}
                        fill={info.fill}
                        strokeWidth={info.strokeWidth}
                        onClick={common.onClick}
                        onMouseDown={common.onMouseDown}
                        onContextMenu={common.onContextMenu}
                        style={common.style}
                    />
                ));
            }

            return <path d={raw} data-id={path.id} {...common} key={`line-info-${i}-${k}`} />;
        });
    });
    return (
        <>
            {fills}
            {lines}
            {/* {path.debug && origPath ? (
                <DebugOrigPath
                    path={path}
                    origPath={origPath}
                    zoom={zoom}
                    clip={clip}
                />
            ) : null} */}
        </>
    );
};

export const RenderPath = React.memo(RenderPathMemo);
