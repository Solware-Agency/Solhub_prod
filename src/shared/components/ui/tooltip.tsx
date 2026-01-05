"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@shared/lib/utils"

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  )
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} className="cursor-pointer" />
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  // Z-index extremadamente alto para estar por encima de todos los modales
  // Usamos el máximo valor seguro de z-index en CSS
  const tooltipZIndex = 2147483647; // Máximo valor de z-index en CSS
  
  // Obtener o crear un contenedor específico para tooltips que se renderice después de los modales
  const getTooltipContainer = () => {
    if (typeof document === 'undefined') return null;
    
    // Buscar o crear un contenedor específico para tooltips
    let container = document.getElementById('tooltip-portal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'tooltip-portal-container';
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '0';
      container.style.height = '0';
      container.style.pointerEvents = 'none';
      container.style.zIndex = '2147483647';
      document.body.appendChild(container);
    }
    return container;
  };
  
  const container = getTooltipContainer();
  
  return (
    <TooltipPrimitive.Portal container={container || undefined}>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance max-w-xs text-center shadow-xl pointer-events-auto tooltip-max-z",
          className
        )}
        style={{ 
          zIndex: tooltipZIndex,
          position: 'fixed',
        }}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow 
          className="fill-white dark:fill-gray-900 border border-gray-200 dark:border-gray-700 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]"
          style={{ zIndex: tooltipZIndex }}
        />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
