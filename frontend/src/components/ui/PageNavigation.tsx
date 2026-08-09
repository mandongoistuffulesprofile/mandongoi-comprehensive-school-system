import type { ReactNode } from "react";
import clsx from "clsx";
import { BackButton } from "./BackButton";
import type { BackButtonProps } from "./BackButton";
import { Tabs, type TabItem } from "./Tabs";
import { QuickSwitchers, type SwitcherItem } from "./QuickSwitchers";
import { PageHeader } from "./Basics";

export interface PageNavigationProps {
  /** Back button destination path (omits button if not provided on non-root pages) */
  backTo?: string;
  backLabel?: string;
  backOnClick?: () => void;
  backVariant?: BackButtonProps["variant"];
  /** Page header content */
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Tab configuration (replaces hand-rolled tabs) */
  tabs?: TabItem[];
  activeTab?: string;
  onTabChange?: (key: string) => void;
  /** Quick switcher items for module navigation */
  quickSwitchers?: SwitcherItem[];
  activeQuickSwitcher?: string;
  className?: string;
}

/**
 * PageNavigation orchestrates the three structural UI elements required across all pages:
 * 1. Contextual Back Button (top-left, before header title)
 * 2. Hierarchical Breadcrumbs (inherited from AppShell)
 * 3. Module Tabs / Quick Switchers (below header)
 */
export function PageNavigation({
  backTo,
  backLabel = "Back",
  backOnClick,
  backVariant,
  title,
  description,
  actions,
  tabs,
  activeTab,
  onTabChange,
  quickSwitchers,
  activeQuickSwitcher,
  className,
}: PageNavigationProps) {
  const showBackButton = backTo !== undefined || backOnClick !== undefined;

  return (
    <div className={clsx("space-y-4", className)}>
      {/* Back button — placed above the page header */}
      {showBackButton && (
        <BackButton
          to={backTo}
          label={backLabel}
          onClick={backOnClick}
          variant={backVariant}
        />
      )}

      {/* Page header with optional actions */}
      <PageHeader title={title} description={description} actions={actions} />

      {/* Quick switchers (module navigation) */}
      {quickSwitchers && quickSwitchers.length > 0 && (
        <QuickSwitchers items={quickSwitchers} activeKey={activeQuickSwitcher} />
      )}

      {/* Tab navigation (entity sub-page navigation) */}
      {tabs && tabs.length > 0 && onTabChange && activeTab !== undefined && (
        <Tabs tabs={tabs} value={activeTab} onValueChange={onTabChange} />
      )}
    </div>
  );
}
