"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SwitchProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  id?: string
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked = false, onCheckedChange, disabled, className, id, ...props }, ref) => {
    return (
      <button
        ref={ref}
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          "relative inline-flex items-center rounded-full transition-colors duration-200 ease-in-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-green-500" : "bg-gray-300",
          className
        )}
        style={{
          width: '51px',
          height: '31px',
          padding: '2px',
          flexShrink: 0,
        }}
        {...props}
      >
        <span
          className={cn(
            "inline-block rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out"
          )}
          style={{
            width: '27px',
            height: '27px',
            transform: checked ? 'translateX(20px)' : 'translateX(0)',
          }}
        />
      </button>
    )
  }
)

Switch.displayName = "Switch"

export { Switch }
