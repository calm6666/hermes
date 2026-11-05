import { Driver, DriveStep } from "./driver";
import { AllowedButtons, PopoverDOM } from "./popover";
import { State } from "./state";

/**
 * 驱动器钩子函数类型 - 定义所有回调函数的统一签名
 * @param element - 当前步骤的目标元素
 * @param step - 当前引导步骤配置
 * @param opts - 包含配置、状态和驱动器实例的对象
 */
export type DriverHook = (
  element: Element | undefined,
  step: DriveStep,
  opts: { config: Config; state: State; driver: Driver }
) => void;

/**
 * 驱动器配置类型 - 定义驱动器的所有配置选项
 */
export type Config = {
  steps?: DriveStep[];

  animate?: boolean;
  overlayColor?: string;
  overlayOpacity?: number;
  smoothScroll?: boolean;
  allowClose?: boolean;
  overlayClickBehavior?: "close" | "nextStep" | DriverHook;
  stagePadding?: number;
  stageRadius?: number;

  disableActiveInteraction?: boolean;

  allowKeyboardControl?: boolean;

  // 弹出框特定配置
  popoverClass?: string;
  popoverOffset?: number;
  showButtons?: AllowedButtons[];
  disableButtons?: AllowedButtons[];
  showProgress?: boolean;

  // 按钮文本
  progressText?: string;
  nextBtnText?: string;
  prevBtnText?: string;
  doneBtnText?: string;

  // 在 popover 渲染后调用
  onPopoverRender?: (popover: PopoverDOM, opts: { config: Config; state: State, driver: Driver }) => void;

 // 状态的回调，在状态变化时调用
  onHighlightStarted?: DriverHook;
  onHighlighted?: DriverHook;
  onDeselected?: DriverHook;
  onDestroyStarted?: DriverHook;
  onDestroyed?: DriverHook;

  // 事件回调，在事件发生时调用
  onNextClick?: DriverHook;
  onPrevClick?: DriverHook;
  onCloseClick?: DriverHook;
};

let currentConfig: Config = {};
let currentDriver: Driver;

/**
 * 配置驱动器 - 设置驱动器的全局配置选项
 * @param config - 驱动器配置对象
 */
export function configure(config: Config = {}) {
  currentConfig = {
    animate: true,
    allowClose: true,
    overlayClickBehavior: "close",
    overlayOpacity: 0.7,
    smoothScroll: false,
    disableActiveInteraction: false,
    showProgress: false,
    stagePadding: 10,
    stageRadius: 5,
    popoverOffset: 10,
    showButtons: ["next", "previous", "close"],
    disableButtons: [],
    overlayColor: "#000",
    ...config,
  };
}

/**
 * 获取配置 - 获取驱动器的当前配置
 * @param key - 可选的配置键名，不传则返回完整配置对象
 * @returns 配置值或完整配置对象
 */
export function getConfig(): Config;
export function getConfig<K extends keyof Config>(key: K): Config[K];
export function getConfig<K extends keyof Config>(key?: K) {
  return key ? currentConfig[key] : currentConfig;
}

/**
 * 设置当前驱动器实例 - 用于内部引用当前激活的驱动器
 * @param driver - 驱动器实例
 */
export function setCurrentDriver(driver: Driver) {
  currentDriver = driver;
}

/**
 * 获取当前驱动器实例 - 返回当前激活的驱动器对象
 * @returns 当前驱动器实例
 */
export function getCurrentDriver() {
  return currentDriver;
}
