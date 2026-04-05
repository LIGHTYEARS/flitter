// ExpandCollapse widget state stub (N7).
//
// Provides a simple expand/collapse state model for container widgets
// that can toggle between expanded and collapsed views.

/**
 * State model for an expand/collapse container widget.
 *
 * Tracks whether the container is expanded and provides a toggle method.
 * The label describes the collapsible section.
 */
export class ExpandCollapseState {
  expanded: boolean;
  label: string;

  constructor(label: string, expanded: boolean = false) {
    this.label = label;
    this.expanded = expanded;
  }

  /** Toggle between expanded and collapsed states. */
  toggle(): void {
    this.expanded = !this.expanded;
  }
}
