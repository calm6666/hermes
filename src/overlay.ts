import { easeInOutQuad } from "./utils";
import { onDriverClick } from "./events";
import { emit } from "./emitter";
import { getConfig } from "./config";
import { getState, setState } from "./state";

/**
 * 舞台定义类型 - 定义高亮区域的坐标和尺寸
 */
export type StageDefinition = {
  x: number;
  y: number;
  width: number;
  height: number;
};
// 该方法计算区域的动画新位置（由 requestAnimationFrame 每帧调用）
// This method calculates the animated new position of the
// stage (called for each frame by requestAnimationFrame)
/**
 * 过渡区域动画 - 计算并渲染高亮区域从一个元素到另一个元素的过渡动画
 * @param elapsed - 已过去的时间
 * @param duration - 动画总时长
 * @param from - 起始元素
 * @param to - 目标元素
 */
export function transitionStage(elapsed: number, duration: number, from: Element, to: Element) {
  let activeStagePosition = getState("__activeStagePosition");

  const fromDefinition = activeStagePosition ? activeStagePosition : from.getBoundingClientRect();
  const toDefinition = to.getBoundingClientRect();

  const x = easeInOutQuad(elapsed, fromDefinition.x, toDefinition.x - fromDefinition.x, duration);
  const y = easeInOutQuad(elapsed, fromDefinition.y, toDefinition.y - fromDefinition.y, duration);
  const width = easeInOutQuad(elapsed, fromDefinition.width, toDefinition.width - fromDefinition.width, duration);
  const height = easeInOutQuad(elapsed, fromDefinition.height, toDefinition.height - fromDefinition.height, duration);

  activeStagePosition = {
    x,
    y,
    width,
    height,
  };

  renderOverlay(activeStagePosition);
  setState("__activeStagePosition", activeStagePosition);
}

/**
 * 跟踪活动元素 - 设置并渲染指定元素的高亮舞台
 * @param element - 要高亮的元素
 */
export function trackActiveElement(element: Element) {
  if (!element) {
    return;
  }

  const definition = element.getBoundingClientRect();

  const activeStagePosition: StageDefinition = {
    x: definition.x,
    y: definition.y,
    width: definition.width,
    height: definition.height,
  };

  setState("__activeStagePosition", activeStagePosition);

  renderOverlay(activeStagePosition);
}

/**
 * 刷新遮罩层 - 更新遮罩层的视图框大小
 */
export function refreshOverlay() {
  const activeStagePosition = getState("__activeStagePosition");
  const overlaySvg = getState("__overlaySvg");

  if (!activeStagePosition) {
    return;
  }

  if (!overlaySvg) {
    console.warn("No stage svg found.");
    return;
  }

  const windowX = window.innerWidth;
  const windowY = window.innerHeight;

  overlaySvg.setAttribute("viewBox", `0 0 ${windowX} ${windowY}`);
}

function mountOverlay(stagePosition: StageDefinition) {
  const overlaySvg = createOverlaySvg(stagePosition);
  document.body.appendChild(overlaySvg);

  onDriverClick(overlaySvg, e => {
    const target = e.target as SVGElement;
    if (target.tagName !== "path") {
      return;
    }

    emit("overlayClick");
  });

  setState("__overlaySvg", overlaySvg);
}

function renderOverlay(stagePosition: StageDefinition) {
  const overlaySvg = getState("__overlaySvg");

  // 如果元素不可见，则取消渲染
  if (!overlaySvg) {
    mountOverlay(stagePosition);

    return;
  }

  const pathElement = overlaySvg.firstElementChild as SVGPathElement | null;
  if (pathElement?.tagName !== "path") {
    throw new Error("no path element found in stage svg");
  }

  pathElement.setAttribute("d", generateStageSvgPathString(stagePosition));
}

function createOverlaySvg(stage: StageDefinition): SVGSVGElement {
  const windowX = window.innerWidth;
  const windowY = window.innerHeight;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("driver-overlay", "driver-overlay-animated");

  svg.setAttribute("viewBox", `0 0 ${windowX} ${windowY}`);
  svg.setAttribute("xmlSpace", "preserve");
  svg.setAttribute("xmlnsXlink", "http://www.w3.org/1999/xlink");
  svg.setAttribute("version", "1.1");
  svg.setAttribute("preserveAspectRatio", "xMinYMin slice");

  svg.style.fillRule = "evenodd";
  svg.style.clipRule = "evenodd";
  svg.style.strokeLinejoin = "round";
  svg.style.strokeMiterlimit = "2";
  svg.style.zIndex = "10000";
  svg.style.position = "fixed";
  svg.style.top = "0";
  svg.style.left = "0";
  svg.style.width = "100%";
  svg.style.height = "100%";

  const stagePath = document.createElementNS("http://www.w3.org/2000/svg", "path");

  stagePath.setAttribute("d", generateStageSvgPathString(stage));

  stagePath.style.fill = getConfig("overlayColor") || "rgb(0,0,0)";
  stagePath.style.opacity = `${getConfig("overlayOpacity")}`;
  stagePath.style.pointerEvents = "auto";
  stagePath.style.cursor = "auto";

  svg.appendChild(stagePath);

  return svg;
}

function generateStageSvgPathString(stage: StageDefinition) {
  const windowX = window.innerWidth;
  const windowY = window.innerHeight;

  const stagePadding = getConfig("stagePadding") || 0;
  const stageRadius = getConfig("stageRadius") || 0;

  const stageWidth = stage.width + stagePadding * 2;
  const stageHeight = stage.height + stagePadding * 2;

  // 当元素太小而半径无法容纳时防止故障
  const limitedRadius = Math.min(stageRadius, stageWidth / 2, stageHeight / 2);

  // 不允许低于 0 的值   向下取整
  const normalizedRadius = Math.floor(Math.max(limitedRadius, 0));

  const highlightBoxX = stage.x - stagePadding + normalizedRadius;
  const highlightBoxY = stage.y - stagePadding;
  const highlightBoxWidth = stageWidth - normalizedRadius * 2;
  const highlightBoxHeight = stageHeight - normalizedRadius * 2;

  return `M${windowX},0L0,0L0,${windowY}L${windowX},${windowY}L${windowX},0Z
    M${highlightBoxX},${highlightBoxY} h${highlightBoxWidth} a${normalizedRadius},${normalizedRadius} 0 0 1 ${normalizedRadius},${normalizedRadius} v${highlightBoxHeight} a${normalizedRadius},${normalizedRadius} 0 0 1 -${normalizedRadius},${normalizedRadius} h-${highlightBoxWidth} a${normalizedRadius},${normalizedRadius} 0 0 1 -${normalizedRadius},-${normalizedRadius} v-${highlightBoxHeight} a${normalizedRadius},${normalizedRadius} 0 0 1 ${normalizedRadius},-${normalizedRadius} z`;
}

/**
 * 销毁遮罩层 - 从DOM中移除遮罩层元素
 */
export function destroyOverlay() {
  const overlaySvg = getState("__overlaySvg");
  if (overlaySvg) {
    overlaySvg.remove();
  }
}
