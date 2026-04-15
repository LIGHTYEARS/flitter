class P1T {
  scrollableState;
  context = null;
  constructor(T) {
    this.scrollableState = T;
  }
  updateContext(T) {
    this.context = T;
  }
  handleKeyEvent(T) {
    let {
      key: R
    } = T;
    if (this.scrollableState.widget.axisDirection === "vertical") switch (R) {
      case "ArrowUp":
        if (this.scrollableState.controller.maxScrollExtent <= 0) return "ignored";
        return this.scrollableState.handleScrollDelta(-this.getScrollStep()), "handled";
      case "ArrowDown":
        if (this.scrollableState.controller.maxScrollExtent <= 0) return "ignored";
        return this.scrollableState.handleScrollDelta(this.getScrollStep()), "handled";
      case "k":
        return this.scrollableState.handleScrollDelta(-this.getScrollStep()), "handled";
      case "j":
        return this.scrollableState.handleScrollDelta(this.getScrollStep()), "handled";
      case "PageUp":
        return this.scrollableState.handleScrollDelta(-this.getPageScrollStep()), "handled";
      case "PageDown":
        return this.scrollableState.handleScrollDelta(this.getPageScrollStep()), "handled";
      case "u":
        if (T.ctrlKey) return this.scrollableState.handleScrollDelta(-this.getPageScrollStep()), "handled";
        break;
      case "d":
        if (T.ctrlKey) return this.scrollableState.handleScrollDelta(this.getPageScrollStep()), "handled";
        break;
      case "Home":
        return this.scrollableState.controller.scrollToTop(), "handled";
      case "End":
        return this.scrollableState.controller.scrollToBottom(), "handled";
      case "g":
        if (T.shiftKey) return this.scrollableState.controller.scrollToBottom(), "handled";else return this.scrollableState.controller.scrollToTop(), "handled";
    }
    if (this.scrollableState.widget.axisDirection === "horizontal") switch (R) {
      case "ArrowLeft":
        return this.scrollableState.handleScrollDelta(-this.getScrollStep()), "handled";
      case "ArrowRight":
        return this.scrollableState.handleScrollDelta(this.getScrollStep()), "handled";
      case "h":
        return this.scrollableState.handleScrollDelta(-this.getScrollStep()), "handled";
      case "l":
        return this.scrollableState.handleScrollDelta(this.getScrollStep()), "handled";
      case "Home":
        return this.scrollableState.controller.scrollToTop(), "handled";
      case "End":
        return this.scrollableState.controller.scrollToBottom(), "handled";
      case "g":
        if (T.shiftKey) return this.scrollableState.controller.scrollToBottom(), "handled";else return this.scrollableState.controller.scrollToTop(), "handled";
    }
    return "ignored";
  }
  handleMouseWheel(T) {
    let R = T * this.getScrollStep();
    this.scrollableState.handleScrollDelta(R);
  }
  handleMouseEvent(T) {
    if (T.button >= 64 && T.button <= 67 && T.pressed) switch (T.button) {
      case 64:
        if (this.scrollableState.widget.axisDirection === "vertical") return this.scrollableState.handleScrollDelta(-this.getScrollStep()), !0;
        break;
      case 65:
        if (this.scrollableState.widget.axisDirection === "vertical") return this.scrollableState.handleScrollDelta(this.getScrollStep()), !0;
        break;
      case 66:
        if (this.scrollableState.widget.axisDirection === "horizontal") return this.scrollableState.handleScrollDelta(-this.getScrollStep()), !0;
        break;
      case 67:
        if (this.scrollableState.widget.axisDirection === "horizontal") return this.scrollableState.handleScrollDelta(this.getScrollStep()), !0;
        break;
    }
    return !1;
  }
  getScrollStep() {
    if (this.context) try {
      return I9.capabilitiesOf(this.context).scrollStep();
    } catch {}
    return 3;
  }
  getPageScrollStep() {
    return 10;
  }
}