"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex shrink-0 cursor-pointer items-center rounded-full",
        "transition-colors duration-200 ease-in-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300",
        className
      )}
      style={{
        width: '51px',
        height: '31px',
        minWidth: '51px',
        minHeight: '31px',
        padding: '2px',
      }}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className="pointer-events-none block rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out"
        style={{
          width: '27px',
          height: '27px',
          transform: 'translateX(var(--switch-thumb-x, 0))',
        }}
        data-state={props.checked ? 'checked' : 'unchecked'}
      />
    </SwitchPrimitive.Root>
  )
}

// Добавляем CSS для анимации
const SwitchWithStyles = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    className={cn(
      "peer inline-flex shrink-0 cursor-pointer items-center rounded-full",
      "transition-colors duration-200 ease-in-out",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300",
      className
    )}
    style={{
      width: '51px',
      height: '31px',
      padding: '2px',
    }}
    ref={ref}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        "pointer-events-none block rounded-full bg-white shadow-md",
        "transition-transform duration-200 ease-in-out",
        "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
      )}
      style={{
        width: '27px',
        height: '27px',
      }}
    />
  </SwitchPrimitive.Root>
))
SwitchWithStyles.displayName = "Switch"

export { SwitchWithStyles as Switch }
