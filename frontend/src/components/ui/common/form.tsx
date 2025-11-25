"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/common/label"

interface FormControl {
  _formValues?: Record<string, {
    value: unknown
    onChange: (event: unknown) => void
    onBlur: () => void
  }>
}

const Form = React.createContext<{
  form: unknown
}>({
  form: null,
})

const FormField = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    control: FormControl
    name: string
    render: (props: { field: unknown; fieldState: unknown; formState: unknown }) => React.ReactNode
  }
>(({ className, control, name, render, ...props }, ref) => {
  const field = control._formValues?.[name] || { value: "", onChange: () => {}, onBlur: () => {} }
  const fieldState = { error: null, isDirty: false, isTouched: false }
  const formState = { errors: {}, isSubmitting: false }

  return (
    <div ref={ref} className={cn("space-y-2", className)} {...props}>
      {render({ field, fieldState, formState })}
    </div>
  )
})
FormField.displayName = "FormField"

const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div ref={ref} className={cn("space-y-2", className)} {...props} />
  )
})
FormItem.displayName = "FormItem"

const FormLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => {
  return (
    <Label
      ref={ref}
      className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}
      {...props}
    />
  )
})
FormLabel.displayName = "FormLabel"

const FormControl = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div ref={ref} className={cn("", className)} {...props} />
  )
})
FormControl.displayName = "FormControl"

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
})
FormDescription.displayName = "FormDescription"

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  if (!children) {
    return null
  }

  return (
    <p
      ref={ref}
      className={cn("text-sm font-medium text-destructive", className)}
      {...props}
    >
      {children}
    </p>
  )
})
FormMessage.displayName = "FormMessage"

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
}

function useFormField() {
  const fieldContext = React.useContext(Form)
  const itemContext = React.useContext(Form)
  
  // Type guard to check if fieldContext has the expected properties
  const hasFormState = fieldContext && typeof fieldContext === 'object' && 'getFieldState' in fieldContext && 'formState' in fieldContext
  const hasName = itemContext && typeof itemContext === 'object' && 'name' in itemContext

  const fieldState = hasFormState 
    ? (fieldContext as { getFieldState?: (name: string, formState: unknown) => unknown; formState: unknown }).getFieldState?.(
        hasName ? (itemContext as { name: string }).name : '',
        (fieldContext as { formState: unknown }).formState
      )
    : undefined

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>")
  }

  const name = hasName ? (itemContext as { name: string }).name : ''

  return {
    name,
    formItemId: `${name}-form-item`,
    formDescriptionId: `${name}-form-item-description`,
    formMessageId: `${name}-form-item-message`,
    ...(fieldState && typeof fieldState === 'object' ? fieldState : {}),
  }
}
