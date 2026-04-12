import React from 'react'
import { cn } from '@/lib/utils'

const styles = {
  switch: `relative block cursor-pointer h-8 w-[52px]
    [--c-active:#4f46e5]
    [--c-active-inner:#FFFFFF]
    [--c-default:rgba(255,255,255,0.08)]
    [--c-default-dark:rgba(255,255,255,0.14)]
    [transform:translateZ(0)]
    [-webkit-transform:translateZ(0)]
    [backface-visibility:hidden]
    [-webkit-backface-visibility:hidden]
    [perspective:1000]
    [-webkit-perspective:1000]`,
  input: `h-full w-full cursor-pointer appearance-none rounded-full
    bg-[--c-default] outline-none transition-colors duration-500
    border border-white/8
    hover:bg-[--c-default-dark]
    [transform:translate3d(0,0,0)]
    [-webkit-transform:translate3d(0,0,0)]
    data-[checked=true]:bg-[--c-background]
    data-[checked=true]:border-transparent`,
  svg: `pointer-events-none absolute inset-0 fill-white
    [transform:translate3d(0,0,0)]
    [-webkit-transform:translate3d(0,0,0)]`,
  circle: `transform-gpu transition-transform duration-500
    [transform:translate3d(0,0,0)]
    [-webkit-transform:translate3d(0,0,0)]
    [backface-visibility:hidden]
    [-webkit-backface-visibility:hidden]`,
  dropCircle: `transform-gpu transition-transform duration-700
    [transform:translate3d(0,0,0)]
    [-webkit-transform:translate3d(0,0,0)]`,
}

const variantStyles = {
  default: '[--c-background:var(--c-active)]',
}

interface ToggleProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  className?: string
}

export function LiquidToggle({ checked = false, onCheckedChange, className }: ToggleProps) {
  const [isChecked, setIsChecked] = React.useState(checked)

  React.useEffect(() => {
    setIsChecked(checked)
  }, [checked])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsChecked(e.target.checked)
    onCheckedChange?.(e.target.checked)
  }

  return (
    <label className={cn(styles.switch, variantStyles.default, className)}>
      <input
        type="checkbox"
        checked={isChecked}
        onChange={handleChange}
        data-checked={isChecked}
        className={styles.input}
      />
      <svg viewBox="0 0 52 32" filter="url(#liquid-goo)" className={styles.svg}>
        <circle
          className={styles.circle}
          cx="16"
          cy="16"
          r="10"
          style={{
            transformOrigin: '16px 16px',
            transform: `translateX(${isChecked ? '12px' : '0px'}) scale(${isChecked ? '0' : '1'})`,
          }}
        />
        <circle
          className={styles.circle}
          cx="36"
          cy="16"
          r="10"
          style={{
            transformOrigin: '36px 16px',
            transform: `translateX(${isChecked ? '0px' : '-12px'}) scale(${isChecked ? '1' : '0'})`,
          }}
        />
        {isChecked && (
          <circle
            className={styles.dropCircle}
            cx="35"
            cy="-1"
            r="2.5"
          />
        )}
      </svg>
    </label>
  )
}

export function LiquidGooFilter() {
  return (
    <svg className="fixed w-0 h-0">
      <defs>
        <filter id="liquid-goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>
  )
}
