"use client"

import * as React from "react"

interface SwitchProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  id?: string
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked = false, onCheckedChange, disabled, id }, ref) => {
    return (
      <button
        ref={ref}
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          width: '51px',
          minWidth: '51px',
          maxWidth: '51px',
          height: '31px',
          minHeight: '31px',
          maxHeight: '31px',
          borderRadius: '15.5px',
          padding: '2px',
          backgroundColor: checked ? '#34C759' : '#E9E9EB',
          border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'background-color 0.2s ease-in-out',
          flexShrink: 0,
          outline: 'none',
        }}
      >
        <span
          style={{
            display: 'block',
            width: '27px',
            minWidth: '27px',
            maxWidth: '27px',
            height: '27px',
            minHeight: '27px',
            maxHeight: '27px',
            borderRadius: '13.5px',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            transition: 'transform 0.2s ease-in-out',
            transform: checked ? 'translateX(20px)' : 'translateX(0)',
          }}
        />
      </button>
    )
  }
)

Switch.displayName = "Switch"

export { Switch }
