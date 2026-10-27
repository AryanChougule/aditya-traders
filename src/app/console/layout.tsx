import type { Metadata } from "next";
import { ConsoleShell } from "./console-shell";

export const metadata: Metadata = { title: { default: "Store console", template: "%s · Console" } };

export default function ConsoleLayout({ children }: LayoutProps<"/console">) {
  return <ConsoleShell>{children}</ConsoleShell>;
}
