import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-base font-body font-bold cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "scribble-border bg-primary text-primary-foreground paper-shadow hover:-translate-y-0.5 hover:bg-red/90 active:translate-x-1 active:translate-y-1 active:shadow-none",
        destructive: "scribble-border bg-destructive text-destructive-foreground paper-shadow hover:bg-red/90",
        outline:
          "scribble-border bg-paper text-ink paper-shadow-small hover:bg-yellow hover:text-ink",
        secondary: "scribble-border-blue bg-secondary text-secondary-foreground paper-shadow-small hover:bg-blue-soft",
        ghost: "border-2 border-transparent hover:border-ink hover:bg-yellow hover:text-ink",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-12 px-5 py-2",
        sm: "min-h-10 px-3 text-sm",
        lg: "min-h-14 px-8 text-lg",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
