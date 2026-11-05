import { DriveStep } from "./driver";
import { refreshOverlay, trackActiveElement, transitionStage } from "./overlay";
import { getConfig, getCurrentDriver } from "./config";
import { hidePopover, renderPopover, repositionPopover } from "./popover";
import { bringInView } from "./utils";
import { getState, setState } from "./state";

function mountDummyElement(): Element {
  const existingDummy = document.getElementById("driver-dummy-element");
  if (existingDummy) {
    return existingDummy;
  }

  let element = document.createElement("div");

  element.id = "driver-dummy-element";
  element.style.width = "0";
  element.style.height = "0";
  element.style.pointerEvents = "none";
  element.style.opacity = "0";
  element.style.position = "fixed";
  element.style.top = "50%";
  element.style.left = "50%";

  document.body.appendChild(element);

  return element;
}

/**
 * 高亮元素 - 将指定步骤的元素设置为高亮状态并显示弹窗
 * @param step - 引导步骤配置
 */
export function highlight(step: DriveStep) {
  const { element } = step;
  let elemObj =
    typeof element === "function" ? element() : typeof element === "string" ? document.querySelector(element) : element;

  // 如果没有找到元素，我们会在屏幕中心放置一个 1px 的 div
  // 用于高亮并显示弹出层。
  // 这样是为了显示类似模态窗口的高亮效果。
  if (!elemObj) {
    elemObj = mountDummyElement();
  }

  transferHighlight(elemObj, step);
}

/**
 * 刷新当前高亮 - 重新计算并更新当前高亮元素的位置和弹窗
 */
export function refreshActiveHighlight() {
  const activeHighlight = getState("__activeElement");
  const activeStep = getState("__activeStep")!;

  if (!activeHighlight) {
    return;
  }

  trackActiveElement(activeHighlight);
  refreshOverlay();
  repositionPopover(activeHighlight, activeStep);
}

function transferHighlight(toElement: Element, toStep: DriveStep) {
  const duration = 400;
  const start = Date.now();

  const fromStep = getState("__activeStep");
  const fromElement = getState("__activeElement") || toElement;

  // 如果这是我们第一次高亮显示一个元素，我们会立即显示
  // popover弹出提示。否则，我们会等待动画完成后再显示弹出提示。
  const isFirstHighlight = !fromElement || fromElement === toElement;
  const isToDummyElement = toElement.id === "driver-dummy-element";
  const isFromDummyElement = fromElement.id === "driver-dummy-element";

  const isAnimatedTour = getConfig("animate");
  const highlightStartedHook = toStep.onHighlightStarted || getConfig("onHighlightStarted");
  const highlightedHook = toStep?.onHighlighted || getConfig("onHighlighted");
  const deselectedHook = fromStep?.onDeselected || getConfig("onDeselected");

  const config = getConfig();
  const state = getState();

  if (!isFirstHighlight && deselectedHook) {
    deselectedHook(isFromDummyElement ? undefined : fromElement, fromStep!, {
      config,
      state,
      driver: getCurrentDriver(),
    });
  }

  if (highlightStartedHook) {
    highlightStartedHook(isToDummyElement ? undefined : toElement, toStep, {
      config,
      state,
      driver: getCurrentDriver(),
    });
  }

  const hasDelayedPopover = !isFirstHighlight && isAnimatedTour;
  let isPopoverRendered = false;

  hidePopover();

  setState("previousStep", fromStep);
  setState("previousElement", fromElement);
  setState("activeStep", toStep);
  setState("activeElement", toElement);

  const animate = () => {
    const transitionCallback = getState("__transitionCallback");

    // 这确保了对 transferHighlight 的重复调用不会相互干扰。只有最后一次调用会被执行。
    if (transitionCallback !== animate) {
      return;
    }

    const elapsed = Date.now() - start;
    const timeRemaining = duration - elapsed;
    const isHalfwayThrough = timeRemaining <= duration / 2;

    if (toStep.popover && isHalfwayThrough && !isPopoverRendered && hasDelayedPopover) {
      renderPopover(toElement, toStep);
      isPopoverRendered = true;
    }

    if (getConfig("animate") && elapsed < duration) {
      transitionStage(elapsed, duration, fromElement, toElement);
    } else {
      trackActiveElement(toElement);

      if (highlightedHook) {
        highlightedHook(isToDummyElement ? undefined : toElement, toStep, {
          config: getConfig(),
          state: getState(),
          driver: getCurrentDriver(),
        });
      }

      setState("__transitionCallback", undefined);
      setState("__previousStep", fromStep);
      setState("__previousElement", fromElement);
      setState("__activeStep", toStep);
      setState("__activeElement", toElement);
    }

    window.requestAnimationFrame(animate);
  };

  setState("__transitionCallback", animate);

  window.requestAnimationFrame(animate);

  bringInView(toElement);
  if (!hasDelayedPopover && toStep.popover) {
    renderPopover(toElement, toStep);
  }

  fromElement.classList.remove("driver-active-element", "driver-no-interaction");
  fromElement.removeAttribute("aria-haspopup");
  fromElement.removeAttribute("aria-expanded");
  fromElement.removeAttribute("aria-controls");

  const disableActiveInteraction = toStep.disableActiveInteraction ?? getConfig("disableActiveInteraction");
  if (disableActiveInteraction) {
    toElement.classList.add("driver-no-interaction");
  }

  toElement.classList.add("driver-active-element");
  toElement.setAttribute("aria-haspopup", "dialog");
  toElement.setAttribute("aria-expanded", "true");
  toElement.setAttribute("aria-controls", "driver-popover-content");
}

/**
 * 销毁高亮 - 移除所有高亮状态和虚拟元素
 */
export function destroyHighlight() {
  document.getElementById("driver-dummy-element")?.remove();
  document.querySelectorAll(".driver-active-element").forEach(element => {
    element.classList.remove("driver-active-element", "driver-no-interaction");
    element.removeAttribute("aria-haspopup");
    element.removeAttribute("aria-expanded");
    element.removeAttribute("aria-controls");
  });
}
