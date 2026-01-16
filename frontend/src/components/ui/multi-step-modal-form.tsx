import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft, ChevronRight, Check, CalendarIcon } from "lucide-react";
import { format, parse, isValid } from "date-fns";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

export interface FormStep {
  id: string;
  title: string;
  description?: string;
  fields: FormFieldConfig[];
}

export interface MultiStepModalFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  steps: FormStep[];
  onSubmit: (data: Record<string, unknown>) => void | Promise<void>;
  submitLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  className?: string;
  variant?: "default" | "finance" | "cooking" | "reading" | "coding" | "plants" | "household";
}

function buildSchema(steps: FormStep[]) {
  const schemaShape: Record<string, z.ZodTypeAny> = {};

  steps.forEach((step) => {
    step.fields.forEach((field) => {
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
        case "date":
          if (field.required) {
            fieldSchema = z.date({ message: `${field.label} is required` });
          } else {
            fieldSchema = z.date().optional();
          }
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
  });

  return z.object(schemaShape);
}

function getDefaultValues(steps: FormStep[]) {
  const defaults: Record<string, unknown> = {};
  steps.forEach((step) => {
    step.fields.forEach((field) => {
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
          case "date":
            defaults[field.name] = undefined;
            break;
          default:
            defaults[field.name] = "";
        }
      }
    });
  });
  return defaults;
}

// DatePicker component with editable input
interface DatePickerFieldProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
}

function DatePickerField({ value, onChange, placeholder }: DatePickerFieldProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);

  // Sync input value when date changes from calendar
  React.useEffect(() => {
    if (value && isValid(value)) {
      setInputValue(format(value, "dd/MM/yyyy"));
    } else {
      setInputValue("");
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Try to parse the date as user types
    if (newValue.length === 10) {
      const parsed = parse(newValue, "dd/MM/yyyy", new Date());
      if (isValid(parsed)) {
        onChange(parsed);
      }
    }
  };

  const handleInputBlur = () => {
    // On blur, try to parse and validate
    if (inputValue) {
      const parsed = parse(inputValue, "dd/MM/yyyy", new Date());
      if (isValid(parsed)) {
        onChange(parsed);
        setInputValue(format(parsed, "dd/MM/yyyy"));
      } else {
        // Reset to valid value or clear
        if (value && isValid(value)) {
          setInputValue(format(value, "dd/MM/yyyy"));
        } else {
          setInputValue("");
        }
      }
    } else {
      onChange(undefined);
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    onChange(date);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <div className="relative">
        <Input
          type="text"
          placeholder={placeholder || "DD/MM/YYYY"}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          className="pr-10"
        />
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
          >
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleCalendarSelect}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
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

const variantAccentStyles = {
  default: "bg-primary",
  finance: "bg-finance",
  cooking: "bg-cooking",
  reading: "bg-reading",
  coding: "bg-coding",
  plants: "bg-plants",
  household: "bg-household",
};

export function MultiStepModalForm({
  open,
  onOpenChange,
  title,
  description,
  steps,
  onSubmit,
  submitLabel = "Submit",
  cancelLabel = "Cancel",
  isLoading = false,
  className,
  variant = "default",
}: MultiStepModalFormProps) {
  const [currentStep, setCurrentStep] = React.useState(0);
  const schema = React.useMemo(() => buildSchema(steps), [steps]);
  const defaultValues = React.useMemo(() => getDefaultValues(steps), [steps]);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onChange",
  });

  React.useEffect(() => {
    if (open) {
      form.reset(defaultValues);
      setCurrentStep(0);
    }
  }, [open, form, defaultValues]);

  const currentStepData = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  const validateCurrentStep = async () => {
    const fieldsToValidate = currentStepData.fields.map((f) => f.name);
    const result = await form.trigger(fieldsToValidate as any);
    return result;
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (data: Record<string, unknown>) => {
    await onSubmit(data);
    form.reset();
    setCurrentStep(0);
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
          <FormItem className={cn(
            type === "checkbox" ? "flex flex-row items-start space-x-3 space-y-0" : "",
            type === "date" ? "flex flex-col" : ""
          )}>
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
                <Select onValueChange={field.onChange} value={field.value as string}>
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
              ) : type === "date" ? (
                <DatePickerField
                  value={field.value as Date | undefined}
                  onChange={field.onChange}
                  placeholder={placeholder}
                />
              ) : (
                <Input
                  type={type === "number" ? "number" : type === "email" ? "email" : type === "url" ? "url" : "text"}
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
      <DialogContent className={cn("sm:max-w-[550px]", variantStyles[variant], className)}>
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

            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2">
              {steps.map((step, index) => {
                const isCompleted = index < currentStep;
                const isCurrent = index === currentStep;

                return (
                  <React.Fragment key={step.id}>
                    <button
                      type="button"
                      onClick={() => index < currentStep && setCurrentStep(index)}
                      disabled={index > currentStep}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-all",
                        isCompleted && cn(variantAccentStyles[variant], "text-white cursor-pointer"),
                        isCurrent && cn("ring-2 ring-offset-2", `ring-${variant === "default" ? "primary" : variant}`, "bg-background text-foreground"),
                        !isCompleted && !isCurrent && "bg-muted text-muted-foreground cursor-not-allowed"
                      )}
                    >
                      {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
                    </button>
                    {index < steps.length - 1 && (
                      <div
                        className={cn(
                          "h-0.5 w-8 transition-colors",
                          index < currentStep ? variantAccentStyles[variant] : "bg-muted"
                        )}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Step Title */}
            <div className="text-center">
              <h3 className="font-medium text-lg">{currentStepData.title}</h3>
              {currentStepData.description && (
                <p className="text-sm text-muted-foreground mt-1">{currentStepData.description}</p>
              )}
            </div>

            {/* Step Fields */}
            <div className="space-y-4 py-2 px-1 -mx-1 max-h-[45vh] overflow-y-auto">
              {currentStepData.fields.map(renderField)}
            </div>

            <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
              <div>
                {!isFirstStep && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleBack}
                    disabled={isLoading}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  {cancelLabel}
                </Button>

                {isLastStep ? (
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className={cn("text-white", variantButtonStyles[variant])}
                  >
                    {isLoading ? "Submitting..." : submitLabel}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={isLoading}
                    className={cn("text-white", variantButtonStyles[variant])}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
