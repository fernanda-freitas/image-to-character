"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Switch({ className, size = "default", ...props }) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-all outline-none",
        "after:absolute after:-inset-x-3 after:-inset-y-2",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "data-[size=default]:h-[20px] data-[size=default]:w-[36px]",
        "data-[size=sm]:h-[16px] data-[size=sm]:w-[28px]",
        "data-[state=checked]:bg-primary data-[state=unchecked]:bg-zinc-300",
        "dark:data-[state=unchecked]:bg-zinc-600",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow-sm transition-transform",
          "group-data-[size=default]/switch:size-[16px]",
          "group-data-[size=sm]/switch:size-[12px]",
          "group-data-[size=default]/switch:data-[state=checked]:translate-x-[18px]",
          "group-data-[size=default]/switch:data-[state=unchecked]:translate-x-[2px]",
          "group-data-[size=sm]/switch:data-[state=checked]:translate-x-[14px]",
          "group-data-[size=sm]/switch:data-[state=unchecked]:translate-x-[2px]",
          "dark:data-[state=checked]:bg-primary-foreground"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
