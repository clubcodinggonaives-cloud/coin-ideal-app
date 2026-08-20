import { Controller, type FieldValues, type FieldPath, type ControllerProps } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { cn } from "@/utils/cn"

interface FormFieldProps<T extends FieldValues> extends Omit<ControllerProps<T, FieldPath<T>>, "render"> {
  label?: string
  error?: string
  helperText?: string
  type?: "text" | "email" | "password" | "number" | "tel" | "url"
  placeholder?: string
  className?: string
  disabled?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

function FormField<T extends FieldValues>({
  name,
  control,
  label,
  error,
  helperText,
  type = "text",
  placeholder,
  className,
  disabled,
  leftIcon,
  rightIcon,
  rules,
}: FormFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field }) => (
        <div className={cn("w-full", className)}>
          <Input
            {...field}
            type={type}
            label={label}
            placeholder={placeholder}
            error={error}
            helperText={helperText}
            disabled={disabled}
            leftIcon={leftIcon}
            rightIcon={rightIcon}
            value={typeof field.value === "number" ? field.value : (field.value ?? "")}
          />
        </div>
      )}
    />
  )
}

interface FormTextareaProps<T extends FieldValues> extends Omit<ControllerProps<T, FieldPath<T>>, "render"> {
  label?: string
  error?: string
  placeholder?: string
  className?: string
  disabled?: boolean
  rows?: number
}

function FormTextarea<T extends FieldValues>({
  name,
  control,
  label,
  error,
  placeholder,
  className,
  disabled,
  rows = 4,
  rules,
}: FormTextareaProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field }) => (
        <div className={cn("w-full", className)}>
          <Textarea
            {...field}
            label={label}
            placeholder={placeholder}
            error={error}
            disabled={disabled}
            rows={rows}
            value={field.value ?? ""}
          />
        </div>
      )}
    />
  )
}

interface FormSelectProps<T extends FieldValues> extends Omit<ControllerProps<T, FieldPath<T>>, "render"> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
  className?: string
  disabled?: boolean
}

function FormSelect<T extends FieldValues>({
  name,
  control,
  label,
  error,
  options,
  placeholder,
  className,
  disabled,
  rules,
}: FormSelectProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field }) => (
        <div className={cn("w-full", className)}>
          <Select
            {...field}
            label={label}
            error={error}
            options={options}
            placeholder={placeholder}
            disabled={disabled}
            value={field.value ?? ""}
          />
        </div>
      )}
    />
  )
}

export { FormField, FormTextarea, FormSelect }
