import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type FieldType = "text" | "number" | "email" | "textarea" | "select" | "checkbox" | "date" | "url";

export interface SelectOption {
  value: string;
  label: string;
}

export interface FormFieldConfig {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  description?: string;
  required?: boolean;
  options?: SelectOption[];
  defaultValue?: string | number | boolean;
  min?: number;
  max?: number;
  step?: number;
}

export interface ModalFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: FormFieldConfig[];
  onSubmit: (data: Record<string, unknown>) => void | Promise<void>;
  submitLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  className?: string;
  variant?: "default" | "finance" | "cooking" | "reading" | "coding" | "plants" | "household";
}

function buildSchema(fields: FormFieldConfig[]) {
  const schemaShape: Record<string, z.ZodTypeAny> = {};

  fields.forEach((field) => {
    let fieldSchema: z.ZodTypeAny;

    switch (field.type) {
      case "number":
        fieldSchema = z.coerce.number();
        if (field.min !== undefined) fieldSchema = (fieldSchema as z.ZodNumber).min(field.min);
        if (field.max !== undefined) fieldSchema = (fieldSchema as z.ZodNumber).max(field.max);
        if (!field.required) fieldSchema = fieldSchema.optional();
        break;
      case "email":
        fieldSchema = z.string().email("Invalid email address");
        if (!field.required) fieldSchema = fieldSchema.optional().or(z.literal(""));
        break;
      case "url":
        fieldSchema = z.string().url("Invalid URL");
        if (!field.required) fieldSchema = fieldSchema.optional().or(z.literal(""));
        break;
      case "checkbox":
        fieldSchema = z.boolean();
        if (!field.required) fieldSchema = fieldSchema.optional();
        break;
      default:
        fieldSchema = z.string();
        if (field.required) {
          fieldSchema = (fieldSchema as z.ZodString).min(1, `${field.label} is required`);
        }
        break;
    }

    schemaShape[field.name] = fieldSchema;
  });

  return z.object(schemaShape);
}

function getDefaultValues(fields: FormFieldConfig[]) {
  const defaults: Record<string, unknown> = {};
  fields.forEach((field) => {
    if (field.defaultValue !== undefined) {
      defaults[field.name] = field.defaultValue;
    } else {
      switch (field.type) {
        case "checkbox":
          defaults[field.name] = false;
          break;
        case "number":
          defaults[field.name] = "";
          break;
        default:
          defaults[field.name] = "";
      }
    }
  });
  return defaults;
}

const variantStyles = {
  default: "border-primary/20",
  finance: "border-finance/30",
  cooking: "border-cooking/30",
  reading: "border-reading/30",
  coding: "border-coding/30",
  plants: "border-plants/30",
  household: "border-household/30",
};

const variantButtonStyles = {
  default: "bg-primary hover:bg-primary/90",
  finance: "bg-finance hover:bg-finance/90",
  cooking: "bg-cooking hover:bg-cooking/90",
  reading: "bg-reading hover:bg-reading/90",
  coding: "bg-coding hover:bg-coding/90",
  plants: "bg-plants hover:bg-plants/90",
  household: "bg-household hover:bg-household/90",
};

export function ModalForm({
  open,
  onOpenChange,
  title,
  description,
  fields,
  onSubmit,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  isLoading = false,
  className,
  variant = "default",
}: ModalFormProps) {
  const schema = React.useMemo(() => buildSchema(fields), [fields]);
  const defaultValues = React.useMemo(() => getDefaultValues(fields), [fields]);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  React.useEffect(() => {
    if (open) {
      form.reset(defaultValues);
    }
  }, [open, form, defaultValues]);

  const handleSubmit = async (data: Record<string, unknown>) => {
    await onSubmit(data);
    form.reset();
    onOpenChange(false);
  };

  const renderField = (fieldConfig: FormFieldConfig) => {
    const { name, label, type, placeholder, description: fieldDescription, options } = fieldConfig;

    return (
      <FormField
        key={name}
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem className={type === "checkbox" ? "flex flex-row items-start space-x-3 space-y-0" : ""}>
            {type !== "checkbox" && <FormLabel>{label}</FormLabel>}
            <FormControl>
              {type === "textarea" ? (
                <Textarea
                  placeholder={placeholder}
                  className="resize-none min-h-[100px]"
                  {...field}
                  value={field.value as string}
                />
              ) : type === "select" ? (
                <Select onValueChange={field.onChange} defaultValue={field.value as string}>
                  <SelectTrigger>
                    <SelectValue placeholder={placeholder || `Select ${label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {options?.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : type === "checkbox" ? (
                <Checkbox
                  checked={field.value as boolean}
                  onCheckedChange={field.onChange}
                />
              ) : (
                <Input
                  type={type === "number" ? "number" : type === "date" ? "date" : type === "email" ? "email" : type === "url" ? "url" : "text"}
                  placeholder={placeholder}
                  min={fieldConfig.min}
                  max={fieldConfig.max}
                  step={fieldConfig.step}
                  {...field}
                  value={field.value as string | number}
                />
              )}
            </FormControl>
            {type === "checkbox" && <FormLabel className="font-normal">{label}</FormLabel>}
            {fieldDescription && <FormDescription>{fieldDescription}</FormDescription>}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-[500px]", variantStyles[variant], className)}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
              {description && (
                <DialogDescription className="text-muted-foreground">
                  {description}
                </DialogDescription>
              )}
            </DialogHeader>

            <div className="space-y-4 py-2 px-1 -mx-1 max-h-[60vh] overflow-y-auto">
              {fields.map(renderField)}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                {cancelLabel}
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className={cn("text-white", variantButtonStyles[variant])}
              >
                {isLoading ? "Saving..." : submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
