import { getConfig } from "./config";

/**
 * 缓动函数 - 实现平滑的二次缓入缓出动画效果
 * @param elapsed - 已过去的时间
 * @param initialValue - 初始值
 * @param amountOfChange - 变化量
 * @param duration - 动画总时长
 * @returns 当前插值
 */
export function easeInOutQuad(elapsed: number, initialValue: number, amountOfChange: number, duration: number): number {
  if ((elapsed /= duration / 2) < 1) {
    return (amountOfChange / 2) * elapsed * elapsed + initialValue;
  }
  return (-amountOfChange / 2) * (--elapsed * (elapsed - 2) - 1) + initialValue;
}

/**
 * 获取可聚焦元素 - 从给定父元素中查找所有可聚焦的子元素
 * @param parentEls - 父元素数组
 * @returns 可聚焦元素数组
 */
export function getFocusableElements(parentEls: Element[] | HTMLElement[]) {
  const focusableQuery =
    'a[href]:not([disabled]), button:not([disabled]), textarea:not([disabled]), input[type="text"]:not([disabled]), input[type="radio"]:not([disabled]), input[type="checkbox"]:not([disabled]), select:not([disabled])';

  return parentEls
    .flatMap(parentEl => {
      const isParentFocusable = parentEl.matches(focusableQuery);
      const focusableEls: HTMLElement[] = Array.from(parentEl.querySelectorAll(focusableQuery));

      return [...(isParentFocusable ? [parentEl as HTMLElement] : []), ...focusableEls];
    })
    .filter(el => {
      return getComputedStyle(el).pointerEvents !== "none" && isElementVisible(el);
    });
}

/**
 * 滚动到视图 - 将元素滚动到可视区域内
 * @param element - 要滚动到的元素
 */
export function bringInView(element: Element) {
  if (!element || isElementInView(element)) {
    return;
  }

  const shouldSmoothScroll = getConfig("smoothScroll");

  const isTallerThanViewport = (element as HTMLElement).offsetHeight > window.innerHeight;

  element.scrollIntoView({
    // 移除在可滚动父元素内的元素的平滑滚动
    // 这会导致高亮无法正确渲染
    behavior: !shouldSmoothScroll || hasScrollableParent(element) ? "auto" : "smooth",
    inline: "center",
    block: isTallerThanViewport ? "start" : "center",
  });
}

function hasScrollableParent(e: Element) {
  if (!e || !e.parentElement) {
    return;
  }

  const parent = e.parentElement as HTMLElement & { scrollTopMax?: number };

  return parent.scrollHeight > parent.clientHeight;
}

function isElementInView(element: Element) {
  const rect = element.getBoundingClientRect();

  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * 检查元素是否可见 - 判断元素是否在视口内且可见
 * @param el - 要检查的元素
 * @returns 元素是否可见
 */
export function isElementVisible(el: HTMLElement) {
  return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}
