import { AllowedButtons, destroyPopover, Popover } from "./popover";
import { destroyOverlay } from "./overlay";
import { destroyEvents, initEvents, requireRefresh } from "./events";
import { Config, configure, DriverHook, getConfig, getCurrentDriver, setCurrentDriver } from "./config";
import { destroyHighlight, highlight } from "./highlight";
import { destroyEmitter, listen } from "./emitter";
import { getState, resetState, setState } from "./state";
import "./driver.css";

/**
 * 引导步骤类型定义 - 配置每个步骤的高亮元素、弹窗内容、事件回调等属性
 */
export type DriveStep = {
  element?: string | Element | (() => Element);
  onHighlightStarted?: DriverHook;
  onHighlighted?: DriverHook;
  onDeselected?: DriverHook;
  popover?: Popover;
  disableActiveInteraction?: boolean;
};

/**
 * 驱动器接口定义 - 提供引导功能的所有公共方法
 */
export interface Driver {
  isActive: () => boolean;
  refresh: () => void;
  drive: (stepIndex?: number) => void;
  setConfig: (config: Config) => void;
  setSteps: (steps: DriveStep[]) => void;
  getConfig: () => Config;
  getState: (key?: string) => any;
  getActiveIndex: () => number | undefined;
  isFirstStep: () => boolean;
  isLastStep: () => boolean;
  getActiveStep: () => DriveStep | undefined;
  getActiveElement: () => Element | undefined;
  getPreviousElement: () => Element | undefined;
  getPreviousStep: () => DriveStep | undefined;
  moveNext: () => void;
  movePrevious: () => void;
  moveTo: (index: number) => void;
  hasNextStep: () => boolean;
  hasPreviousStep: () => boolean;
  highlight: (step: DriveStep) => void;
  destroy: () => void;
}

/**
 * 创建驱动器实例 - 初始化引导功能并返回驱动对象
 * @param options - 配置选项
 * @returns Driver对象，提供引导功能的所有方法
 */
export function driver(options: Config = {}): Driver {
  configure(options);

  /**
   * 处理关闭操作 - 当允许关闭时销毁驱动器
   */
  function handleClose() {
    if (!getConfig("allowClose")) {
      return;
    }

    destroy();
  }

  /**
   * 处理遮罩层点击事件 - 根据配置执行关闭、下一步或自定义回调
   */
  function handleOverlayClick() {
    const overlayClickBehavior = getConfig("overlayClickBehavior");

    if (getConfig("allowClose") && overlayClickBehavior === "close") {
      destroy();
      return;
    }

    if (typeof overlayClickBehavior === "function") {
      const activeStep = getState("__activeStep");
      const activeElement = getState("__activeElement");

      overlayClickBehavior(activeElement, activeStep!, {
        config: getConfig(),
        state: getState(),
        driver: getCurrentDriver(),
      });

      return;
    }

    if (overlayClickBehavior === "nextStep") {
      moveNext();
    }
  }

  /**
   * 移动到下一步 - 如果有下一步则执行，否则销毁驱动器
   */
  function moveNext() {
    const activeIndex = getState("activeIndex");
    const steps = getConfig("steps") || [];
    if (typeof activeIndex === "undefined") {
      return;
    }

    const nextStepIndex = activeIndex + 1;
    if (steps[nextStepIndex]) {
      drive(nextStepIndex);
    } else {
      destroy();
    }
  }

  /**
   * 移动到上一步 - 如果有上一步则执行，否则销毁驱动器
   */
  function movePrevious() {
    const activeIndex = getState("activeIndex");
    const steps = getConfig("steps") || [];
    if (typeof activeIndex === "undefined") {
      return;
    }

    const previousStepIndex = activeIndex - 1;
    if (steps[previousStepIndex]) {
      drive(previousStepIndex);
    } else {
      destroy();
    }
  }

  /**
   * 移动到指定步骤 - 根据索引跳转到特定步骤
   * @param index - 目标步骤索引
   */
  function moveTo(index: number) {
    const steps = getConfig("steps") || [];

    if (steps[index]) {
      drive(index);
    } else {
      destroy();
    }
  }

  /**
   * 处理左箭头按键 - 执行上一步操作或自定义回调
   */
  function handleArrowLeft() {
    const isTransitioning = getState("__transitionCallback");
    if (isTransitioning) {
      return;
    }

    const activeIndex = getState("activeIndex");
    const activeStep = getState("__activeStep");
    const activeElement = getState("__activeElement");
    if (typeof activeIndex === "undefined" || typeof activeStep === "undefined") {
      return;
    }

    const currentStepIndex = getState("activeIndex");
    if (typeof currentStepIndex === "undefined") {
      return;
    }

    const onPrevClick = activeStep.popover?.onPrevClick || getConfig("onPrevClick");
    if (onPrevClick) {
      return onPrevClick(activeElement, activeStep, {
        config: getConfig(),
        state: getState(),
        driver: getCurrentDriver(),
      });
    }

    movePrevious();
  }

  /**
   * 处理右箭头按键 - 执行下一步操作或自定义回调
   */
  function handleArrowRight() {
    const isTransitioning = getState("__transitionCallback");
    if (isTransitioning) {
      return;
    }

    const activeIndex = getState("activeIndex");
    const activeStep = getState("__activeStep");
    const activeElement = getState("__activeElement");
    if (typeof activeIndex === "undefined" || typeof activeStep === "undefined") {
      return;
    }

    const onNextClick = activeStep.popover?.onNextClick || getConfig("onNextClick");
    if (onNextClick) {
      return onNextClick(activeElement, activeStep, {
        config: getConfig(),
        state: getState(),
        driver: getCurrentDriver(),
      });
    }

    moveNext();
  }

  /**
   * 初始化驱动器 - 设置事件监听和样式类
   */
  function init() {
    if (getState("isInitialized")) {
      return;
    }

    setState("isInitialized", true);
    document.body.classList.add("driver-active", getConfig("animate") ? "driver-fade" : "driver-simple");

    initEvents();

    listen("overlayClick", handleOverlayClick);
    listen("escapePress", handleClose);
    listen("arrowLeftPress", handleArrowLeft);
    listen("arrowRightPress", handleArrowRight);
  }

  /**
   * 驱动到指定步骤 - 执行引导流程的核心函数
   * @param stepIndex - 步骤索引，默认为0
   */
  function drive(stepIndex: number = 0) {
    const steps = getConfig("steps");
    if (!steps) {
      console.error("No steps to drive through");
      destroy();
      return;
    }

    if (!steps[stepIndex]) {
      destroy();

      return;
    }

    setState("__activeOnDestroyed", document.activeElement as HTMLElement);
    setState("activeIndex", stepIndex);

    const currentStep = steps[stepIndex];
    const hasNextStep = steps[stepIndex + 1];
    const hasPreviousStep = steps[stepIndex - 1];

    const doneBtnText = currentStep.popover?.doneBtnText || getConfig("doneBtnText") || "Done";
    const allowsClosing = getConfig("allowClose");
    const showProgress =
      typeof currentStep.popover?.showProgress !== "undefined"
        ? currentStep.popover?.showProgress
        : getConfig("showProgress");
    const progressText = currentStep.popover?.progressText || getConfig("progressText") || "{{current}} of {{total}}";
    const progressTextReplaced = progressText
      .replace("{{current}}", `${stepIndex + 1}`)
      .replace("{{total}}", `${steps.length}`);

    const configuredButtons = currentStep.popover?.showButtons || getConfig("showButtons");
    const calculatedButtons: AllowedButtons[] = [
      "next",
      "previous",
      ...(allowsClosing ? ["close" as AllowedButtons] : []),
    ].filter(b => {
      return !configuredButtons?.length || configuredButtons.includes(b as AllowedButtons);
    }) as AllowedButtons[];

    const onNextClick = currentStep.popover?.onNextClick || getConfig("onNextClick");
    const onPrevClick = currentStep.popover?.onPrevClick || getConfig("onPrevClick");
    const onCloseClick = currentStep.popover?.onCloseClick || getConfig("onCloseClick");

    highlight({
      ...currentStep,
      popover: {
        showButtons: calculatedButtons,
        nextBtnText: !hasNextStep ? doneBtnText : undefined,
        disableButtons: [...(!hasPreviousStep ? ["previous" as AllowedButtons] : [])],
        showProgress: showProgress,
        progressText: progressTextReplaced,
        onNextClick: onNextClick
          ? onNextClick
          : () => {
              if (!hasNextStep) {
                destroy();
              } else {
                drive(stepIndex + 1);
              }
            },
        onPrevClick: onPrevClick
          ? onPrevClick
          : () => {
              drive(stepIndex - 1);
            },
        onCloseClick: onCloseClick
          ? onCloseClick
          : () => {
              destroy();
            },
        ...(currentStep?.popover || {}),
      },
    });
  }

  /**
   * 销毁驱动器 - 清理所有状态、事件监听和DOM元素
   * @param withOnDestroyStartedHook - 是否触发销毁开始回调
   */
  function destroy(withOnDestroyStartedHook = true) {
    const activeElement = getState("__activeElement");
    const activeStep = getState("__activeStep");

    const activeOnDestroyed = getState("__activeOnDestroyed");

    const onDestroyStarted = getConfig("onDestroyStarted");
    // `onDestroyStarted` 用于确认游览的退出。如果我们触发
    // 当用户调用 `destroy` 时的钩子，驱动程序会进入无限循环
    // 不会导致行程被销毁。
    if (withOnDestroyStartedHook && onDestroyStarted) {
      const isActiveDummyElement = !activeElement || activeElement?.id === "driver-dummy-element";
      onDestroyStarted(isActiveDummyElement ? undefined : activeElement, activeStep!, {
        config: getConfig(),
        state: getState(),
        driver: getCurrentDriver(),
      });
      return;
    }

    const onDeselected = activeStep?.onDeselected || getConfig("onDeselected");
    const onDestroyed = getConfig("onDestroyed");

    document.body.classList.remove("driver-active", "driver-fade", "driver-simple");

    destroyEvents();
    destroyPopover();
    destroyHighlight();
    destroyOverlay();
    destroyEmitter();

    resetState();

    if (activeElement && activeStep) {
      const isActiveDummyElement = activeElement.id === "driver-dummy-element";
      if (onDeselected) {
        onDeselected(isActiveDummyElement ? undefined : activeElement, activeStep, {
          config: getConfig(),
          state: getState(),
          driver: getCurrentDriver(),
        });
      }

      if (onDestroyed) {
        onDestroyed(isActiveDummyElement ? undefined : activeElement, activeStep, {
          config: getConfig(),
          state: getState(),
          driver: getCurrentDriver(),
        });
      }
    }

    if (activeOnDestroyed) {
      (activeOnDestroyed as HTMLElement).focus();
    }
  }

  /**
   * 驱动器API对象 - 实现Driver接口的所有公共方法
   */
    const api: Driver = {
    isActive: () => getState("isInitialized") || false,
    refresh: requireRefresh,
    drive: (stepIndex: number = 0) => {
      init();
      drive(stepIndex);
    },
    setConfig: configure,
    setSteps: (steps: DriveStep[]) => {
      resetState();
      configure({
        ...getConfig(),
        steps,
      });
    },
    getConfig,
    getState,
    getActiveIndex: () => getState("activeIndex"),
    isFirstStep: () => getState("activeIndex") === 0,
    isLastStep: () => {
      const steps = getConfig("steps") || [];
      const activeIndex = getState("activeIndex");

      return activeIndex !== undefined && activeIndex === steps.length - 1;
    },
    getActiveStep: () => getState("activeStep"),
    getActiveElement: () => getState("activeElement"),
    getPreviousElement: () => getState("previousElement"),
    getPreviousStep: () => getState("previousStep"),
    moveNext,
    movePrevious,
    moveTo,
    hasNextStep: () => {
      const steps = getConfig("steps") || [];
      const activeIndex = getState("activeIndex");

      return activeIndex !== undefined && !!steps[activeIndex + 1];
    },
    hasPreviousStep: () => {
      const steps = getConfig("steps") || [];
      const activeIndex = getState("activeIndex");

      return activeIndex !== undefined && !!steps[activeIndex - 1];
    },
    highlight: (step: DriveStep) => {
      init();
      highlight({
        ...step,
        popover: step.popover
          ? {
              showButtons: [],
              showProgress: false,
              progressText: "",
              ...step.popover!,
            }
          : undefined,
      });
    },
    destroy: () => {
      destroy(false);
    },
  };

  setCurrentDriver(api);

  return api;
}
