import { refreshActiveHighlight } from "./highlight";
import { emit } from "./emitter";
import { getState, setState } from "./state";
import { getConfig } from "./config";
import { getFocusableElements } from "./utils";

/**
 * 请求刷新 - 延迟执行高亮刷新操作
 */
export function requireRefresh() {
  const resizeTimeout = getState("__resizeTimeout");
  if (resizeTimeout) {
    window.cancelAnimationFrame(resizeTimeout);
  }

  setState("__resizeTimeout", window.requestAnimationFrame(refreshActiveHighlight));
}

function trapFocus(e: KeyboardEvent) {
  const isActivated = getState("isInitialized");
  if (!isActivated) {
    return;
  }

  const isTabKey = e.key === "Tab" || e.keyCode === 9;
  if (!isTabKey) {
    return;
  }

  const activeElement = getState("__activeElement");
  const popoverEl = getState("popover")?.wrapper;

  const focusableEls = getFocusableElements([
    ...(popoverEl ? [popoverEl] : []),
    ...(activeElement ? [activeElement] : []),
  ]);

  const firstFocusableEl = focusableEls[0];
  const lastFocusableEl = focusableEls[focusableEls.length - 1];

  e.preventDefault();

  if (e.shiftKey) {
    const previousFocusableEl =
      focusableEls[focusableEls.indexOf(document.activeElement as HTMLElement) - 1] || lastFocusableEl;
    previousFocusableEl?.focus();
  } else {
    const nextFocusableEl =
      focusableEls[focusableEls.indexOf(document.activeElement as HTMLElement) + 1] || firstFocusableEl;
    nextFocusableEl?.focus();
  }
}

function onKeyup(e: KeyboardEvent) {
  const allowKeyboardControl = getConfig("allowKeyboardControl") ?? true;

  if (!allowKeyboardControl) {
    return;
  }

  if (e.key === "Escape") {
    emit("escapePress");
  } else if (e.key === "ArrowRight") {
    emit("arrowRightPress");
  } else if (e.key === "ArrowLeft") {
    emit("arrowLeftPress");
  }
}

/**
 * 为 driver.js 创建的元素附加点击事件处理程序。
 * 该函数确保监听器优先处理事件，并阻止所有其他指针事件，
 * 以确保外部库无法感知点击事件的发生。
 *
 * @param {Element} element 要监听点击事件的元素
 * @param {(pointer: MouseEvent | PointerEvent) => void} listener 点击事件处理函数
 * @param {(target: HTMLElement) => boolean} shouldPreventDefault 
 *        判断是否阻止默认行为的函数（例如链接点击等）
 */
export function onDriverClick(
  element: Element,
  listener: (pointer: MouseEvent | PointerEvent) => void,
  shouldPreventDefault?: (target: HTMLElement) => boolean
) {
  const listenerWrapper = (e: MouseEvent | PointerEvent, listener?: (pointer: MouseEvent | PointerEvent) => void) => {
    const target = e.target as HTMLElement;
    if (!element.contains(target)) {
      return;
    }

    if (!shouldPreventDefault || shouldPreventDefault(target)) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }

    listener?.(e);
  };

  
  const useCapture = true;

 // 禁用事件
  document.addEventListener("pointerdown", listenerWrapper, useCapture);
  document.addEventListener("mousedown", listenerWrapper, useCapture);
  document.addEventListener("pointerup", listenerWrapper, useCapture);
  document.addEventListener("mouseup", listenerWrapper, useCapture);

  // 点击处理事件
  document.addEventListener(
    "click",
    e => {
      listenerWrapper(e, listener);
    },
    useCapture
  );
}

/**
 * 初始化事件 - 注册所有必要的事件监听器
 */
export function initEvents() {
  window.addEventListener("keyup", onKeyup, false);
  window.addEventListener("keydown", trapFocus, false);
  window.addEventListener("resize", requireRefresh);
  window.addEventListener("scroll", requireRefresh);
}

/**
 * 销毁事件 - 移除所有事件监听器
 */
export function destroyEvents() {
  window.removeEventListener("keyup", onKeyup);
  window.removeEventListener("resize", requireRefresh);
  window.removeEventListener("scroll", requireRefresh);
}
