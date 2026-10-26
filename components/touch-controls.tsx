"use client";

import { useEffect, useRef, type MouseEvent, type PointerEvent } from "react";
import type { TouchControls as Controls, TouchKey } from "@/games/types";

type Props = {
  controls: Controls;
  disabled: boolean;
};

type Held = {
  code: string;
  delay?: ReturnType<typeof setTimeout>;
  interval?: ReturnType<typeof setInterval>;
};

const REPEAT_DELAY = 170;
const REPEAT_INTERVAL = 50;
const DIRECTIONS = ["up", "left", "right", "down"] as const;

function emit(type: "keydown" | "keyup", code: string, repeat = false) {
  window.dispatchEvent(
    new KeyboardEvent(type, {
      code,
      key: code,
      repeat,
      bubbles: true,
      cancelable: true,
    }),
  );
}

// Suelta una tecla mantenida: cancela la autorrepetición y emite keyup
function release(heldMap: Map<string, Held>, id: string) {
  const held = heldMap.get(id);
  if (!held) return;
  clearTimeout(held.delay);
  clearInterval(held.interval);
  heldMap.delete(id);
  emit("keyup", held.code);
}

function releaseAll(heldMap: Map<string, Held>) {
  for (const id of [...heldMap.keys()]) release(heldMap, id);
}

export function TouchControls({ controls, disabled }: Props) {
  // id de botón (dpad-up, btn-0…) → tecla mantenida
  const heldRef = useRef(new Map<string, Held>());
  const disabledRef = useRef(disabled);

  function press(id: string, key: TouchKey) {
    if (disabledRef.current || heldRef.current.has(id)) return;
    const held: Held = { code: key.code };
    heldRef.current.set(id, held);
    emit("keydown", key.code);
    if (key.repeat) {
      held.delay = setTimeout(() => {
        held.interval = setInterval(
          () => emit("keydown", key.code, true),
          REPEAT_INTERVAL,
        );
      }, REPEAT_DELAY);
    }
  }

  useEffect(() => {
    disabledRef.current = disabled;
    if (disabled) releaseAll(heldRef.current);
  });

  useEffect(() => {
    const heldMap = heldRef.current;
    return () => releaseAll(heldMap);
  }, []);

  function handlers(id: string, key: TouchKey) {
    return {
      onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        press(id, key);
      },
      onPointerUp: () => release(heldRef.current, id),
      onPointerCancel: () => release(heldRef.current, id),
      onLostPointerCapture: () => release(heldRef.current, id),
      onContextMenu: (e: MouseEvent) => e.preventDefault(),
    };
  }

  return (
    <div className={`touch-controls${disabled ? " is-disabled" : ""}`}>
      <div className="touch-dpad">
        {DIRECTIONS.map((dir) => {
          const key = controls.dpad[dir];
          const id = `dpad-${dir}`;
          return key ? (
            <button
              key={dir}
              type="button"
              tabIndex={-1}
              aria-label={dir}
              className={`touch-btn touch-${dir}`}
              {...handlers(id, key)}
            >
              {key.label}
            </button>
          ) : (
            <button
              key={dir}
              type="button"
              tabIndex={-1}
              disabled
              aria-hidden="true"
              className={`touch-btn touch-${dir}`}
              onContextMenu={(e) => e.preventDefault()}
            />
          );
        })}
      </div>
      <div className="touch-buttons">
        {controls.buttons.slice(0, 3).map((key, i) => (
          <button
            key={i}
            type="button"
            tabIndex={-1}
            className="touch-btn touch-action"
            {...handlers(`btn-${i}`, key)}
          >
            {key.label}
          </button>
        ))}
      </div>
    </div>
  );
}
