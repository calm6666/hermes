type allowedEvents =
  | "overlayClick"
  | "escapePress"
  | "nextClick"
  | "prevClick"
  | "closeClick"
  | "arrowRightPress"
  | "arrowLeftPress";

let registeredListeners: Partial<{ [key in allowedEvents]: () => void }> = {};

/**
 * 监听事件 - 注册事件监听器
 * @param hook - 事件名称
 * @param callback - 事件回调函数
 */
export function listen(hook: allowedEvents, callback: () => void) {
  registeredListeners[hook] = callback;
}

/**
 * 触发事件 - 执行指定事件的回调函数
 * @param hook - 事件名称
 */
export function emit(hook: allowedEvents) {
  registeredListeners[hook]?.();
}

/**
 * 销毁事件发射器 - 清空所有事件监听器
 */
export function destroyEmitter() {
  registeredListeners = {};
}
