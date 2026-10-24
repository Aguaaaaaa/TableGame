"use strict";

import { bindRoomCodeInput, setModeVisibility } from "./ui.js";
import { cleanPlayerName, normalizeRoomCode } from "./utils.js";

function noop() {}

function defaultFormatError(kind, error) {
  const label = kind === "create" ? "创建房间失败" : "加入房间失败";
  return `${label}：${error?.message || "未知错误"}`;
}

function setPressed(button, pressed) {
  if (!button) return;
  button.classList?.toggle("active", pressed);
  button.setAttribute?.("aria-selected", String(pressed));
  button.setAttribute?.("aria-pressed", String(pressed));
  button.tabIndex = pressed ? 0 : -1;
}

function setBusy(button, busy) {
  if (!button) return;
  button.disabled = Boolean(busy);
  button.setAttribute?.("aria-busy", String(Boolean(busy)));
}

/**
 * Headless controller for the create/join room entry experience.
 *
 * It owns interaction only. Markup, copy, visual theme and game-specific fields
 * stay in each game. buildCreatePayload/buildJoinPayload are deliberately hooks
 * so games can preserve every special lobby option without changing this layer.
 */
export function createRoomEntryController({
  room,
  spectatorUi = null,
  elements = {},
  initialMode = "host",
  hostFallbackName = "房主",
  guestFallbackName = "玩家",
  buildCreatePayload = () => ({}),
  buildJoinPayload = () => ({}),
  formatError = defaultFormatError,
  notify = (message) => globalThis.alert?.(message),
  onModeChange = noop,
  onCreateSuccess = noop,
  onJoinSuccess = (result) => {
    const status = spectatorUi?.handleJoinResult?.(result)?.statusText;
    if (status && elements.connectionStatus) elements.connectionStatus.textContent = status;
  },
  onError = noop
} = {}) {
  if (!room?.createRoom || !room?.joinRoom) throw new TypeError("room-entry controller requires a room client");

  const {
    root,
    hostModeButton,
    guestModeButton,
    hostSetup,
    guestSetup,
    hostTools,
    hostNameInput,
    guestNameInput,
    roomCodeInput,
    createRoomButton,
    joinRoomButton,
    feedback
  } = elements;
  const disposers = [];
  let mode = initialMode === "guest" ? "guest" : "host";
  let bound = false;
  let pending = null;

  function showFeedback(message = "", type = "") {
    if (!feedback) return;
    feedback.textContent = String(message || "");
    feedback.dataset.type = type;
    feedback.hidden = !message;
  }

  function selectMode(next, { focus = false } = {}) {
    mode = next === "guest" ? "guest" : "host";
    setModeVisibility(mode, { hostSetup, guestSetup, hostTools, hostButton: hostModeButton, guestButton: guestModeButton });
    setPressed(hostModeButton, mode === "host");
    setPressed(guestModeButton, mode === "guest");
    root?.setAttribute?.("data-entry-mode", mode);
    if (focus) (mode === "host" ? hostNameInput : guestNameInput)?.focus?.();
    showFeedback();
    onModeChange(mode);
    return mode;
  }

  function normalizedName(input, fallback) {
    const name = cleanPlayerName(input?.value, fallback);
    if (input) input.value = name;
    return name;
  }

  async function run(kind, button, operation) {
    if (pending) return pending;
    setBusy(button, true);
    root?.setAttribute?.("data-entry-pending", kind);
    showFeedback();
    pending = Promise.resolve()
      .then(operation)
      .catch((error) => {
        const message = formatError(kind, error);
        showFeedback(message, "error");
        onError(error, { kind, message });
        notify?.(message, { kind, error });
        return null;
      })
      .finally(() => {
        setBusy(button, false);
        root?.removeAttribute?.("data-entry-pending");
        pending = null;
      });
    return pending;
  }

  function submitCreate() {
    return run("create", createRoomButton, async () => {
      const base = { name: normalizedName(hostNameInput, hostFallbackName) };
      const extra = await buildCreatePayload({ elements, mode, base: { ...base } });
      const result = await room.createRoom({ ...base, ...(extra || {}) });
      await onCreateSuccess(result);
      return result;
    });
  }

  function submitJoin() {
    return run("join", joinRoomButton, async () => {
      const base = {
        code: normalizeRoomCode(roomCodeInput?.value),
        name: normalizedName(guestNameInput, guestFallbackName),
        intent: spectatorUi?.getJoinIntent?.() || "play"
      };
      if (roomCodeInput) roomCodeInput.value = base.code;
      const extra = await buildJoinPayload({ elements, mode, base: { ...base } });
      const result = await room.joinRoom({ ...base, ...(extra || {}) });
      await onJoinSuccess(result);
      return result;
    });
  }

  function listen(target, type, handler) {
    if (!target?.addEventListener) return;
    target.addEventListener(type, handler);
    disposers.push(() => target.removeEventListener(type, handler));
  }

  function bindEnter(container, submit) {
    listen(container, "keydown", (event) => {
      if (event.key !== "Enter" || event.defaultPrevented || event.isComposing) return;
      if (event.target?.matches?.("textarea,button,[type=button],[type=submit]")) return;
      event.preventDefault?.();
      submit();
    });
  }

  function bind() {
    if (bound) return api;
    bound = true;
    disposers.push(bindRoomCodeInput(roomCodeInput));
    listen(hostModeButton, "click", () => selectMode("host", { focus: true }));
    listen(guestModeButton, "click", () => selectMode("guest", { focus: true }));
    listen(createRoomButton, "click", submitCreate);
    listen(joinRoomButton, "click", submitJoin);
    bindEnter(hostSetup, submitCreate);
    bindEnter(guestSetup, submitJoin);
    selectMode(mode);
    return api;
  }

  function destroy() {
    while (disposers.length) disposers.pop()?.();
    bound = false;
  }

  const api = {
    bind,
    destroy,
    selectMode,
    submitCreate,
    submitJoin,
    getMode: () => mode,
    isPending: () => Boolean(pending)
  };
  return api;
}
