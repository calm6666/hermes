import { StageDefinition } from "./overlay";
import { PopoverDOM } from "./popover";
import { DriveStep } from "./driver";

/**
 * 状态类型定义 - 存储驱动器的所有状态信息
 */
export type State = {
  isInitialized?: boolean;

  activeIndex?: number;
  activeElement?: Element;
  activeStep?: DriveStep;
  previousElement?: Element;
  previousStep?: DriveStep;

  popover?: PopoverDOM;

  // 实际值，考虑了动画和延迟。
  // 这些用于确定位置等。
  __previousElement?: Element;
  __activeElement?: Element;
  __previousStep?: DriveStep;
  __activeStep?: DriveStep;

  __activeOnDestroyed?: Element;
  __resizeTimeout?: number;
  __transitionCallback?: () => void;
  __activeStagePosition?: StageDefinition;
  __overlaySvg?: SVGSVGElement;
};

let currentState: State = {};

/**
 * 设置状态 - 更新驱动器的指定状态值
 * @param key - 状态键名
 * @param value - 状态值
 */
export function setState<K extends keyof State>(key: K, value: State[K]) {
  currentState[key] = value;
}

/**
 * 获取状态 - 获取驱动器的当前状态
 * @param key - 可选的状态键名，不传则返回完整状态对象
 * @returns 状态值或完整状态对象
 */
export function getState(): State;
export function getState<K extends keyof State>(key: K): State[K];
export function getState<K extends keyof State>(key?: K) {
  return key ? currentState[key] : currentState;
}

/**
 * 重置状态 - 清空所有状态数据
 */
export function resetState() {
  currentState = {};
}
